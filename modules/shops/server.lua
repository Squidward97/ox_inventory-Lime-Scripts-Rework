if not lib then return end

local Items = require 'modules.items.server'
local Inventory = require 'modules.inventory.server'
local TriggerEventHooks = require 'modules.hooks.server'
local Utility = require 'modules.utility.shared'
local Shops = {}
local locations = shared.target and 'targets' or 'locations'

---@class OxShopItem
---@field slot number
---@field weight number

local function setupShopItems(id, shopType, shopName, groups)
	local shop = id and Shops[shopType][id] or Shops[shopType] --[[@as OxShop]]

	for i = 1, shop.slots do
		local slot = shop.items[i]

		if slot.grade and not groups then
			print(('^1attempted to restrict slot %s (%s) to grade %s, but %s has no job restriction^0'):format(id, slot.name, json.encode(slot.grade), shopName))
			slot.grade = nil
		end

		local Item = Items(slot.name)

		if Item then
			---@type OxShopItem
			slot = {
				name = Item.name,
				slot = i,
				weight = Item.weight,
				count = slot.count,
				price = (server.randomprices and (not slot.currency or slot.currency == 'money')) and (math.ceil(slot.price * (math.random(80, 120)/100))) or slot.price or 0,
				metadata = slot.metadata,
				license = slot.license,
				currency = slot.currency,
				grade = slot.grade
			}

			if slot.metadata then
				slot.weight = Inventory.SlotWeight(Item, slot, true)
			end

			shop.items[i] = slot
		end
	end
end

---@param shopType string
---@param properties OxShop
local function registerShopType(shopType, properties)
	local shopLocations = properties[locations] or properties.locations

	if shopLocations then
		Shops[shopType] = properties
	else
		Shops[shopType] = {
			label = properties.name,
			id = shopType,
			groups = properties.groups or properties.jobs,
			items = properties.inventory,
			slots = #properties.inventory,
			type = 'shop',
		}

		setupShopItems(nil, shopType, properties.name, properties.groups or properties.jobs)
	end
end

---@param shopType string
---@param id number
local function createShop(shopType, id)
	local shop = Shops[shopType]

	if not shop then return end

	local store = (shop[locations] or shop.locations)?[id]

	if not store then return end

	local groups = shop.groups or shop.jobs
    local coords

    if shared.target then
        if store.length then
            local z = store.loc.z + math.abs(store.minZ - store.maxZ) / 2
            coords = vec3(store.loc.x, store.loc.y, z)
        else
            coords = store.coords or store.loc
        end
    else
        coords = store
    end

	shop[id] = {
		label = shop.name,
		id = shopType..' '..id,
		groups = groups,
		items = table.clone(shop.inventory),
		slots = #shop.inventory,
		type = 'shop',
		coords = coords,
		distance = shared.target and shop.targets?[id]?.distance,
	}

	setupShopItems(id, shopType, shop.name, groups)

	return shop[id]
end

for shopType, shopDetails in pairs(lib.load('data.shops') or {}) do
	registerShopType(shopType, shopDetails)
end

---@param shopType string
---@param shopDetails OxShop
exports('RegisterShop', function(shopType, shopDetails)
	registerShopType(shopType, shopDetails)
end)

lib.callback.register('ox_inventory:openShop', function(source, data)
	local playerInv, shop = Inventory(source)

	if not playerInv then return end

	if data then
		shop = Shops[data.type]

		if not shop then return end

		if not shop.items then
			shop = (data.id and shop[data.id] or createShop(data.type, data.id))

			if not shop then return end
		end

		---@cast shop OxShop

		if shop.groups then
			local group = server.hasGroup(playerInv, shop.groups)
			if not group then return end
		end

		if type(shop.coords) == 'vector3' and #(GetEntityCoords(GetPlayerPed(source)) - shop.coords) > 10 then
			return
		end

		local shopType, shopId = shop.id:match('^(.-) (%d+)$')

        local hookPayload = {
            source = source,
            shopId = shopId or shop.id,
			shopType = shopType or shop.id,
            label = shop.label,
            slots = shop.slots,
            items = shop.items,
            groups = shop.groups,
            coords = shop.coords,
            distance = shop.distance
        }

        local hooks <close> = TriggerEventHooks('openShop', hookPayload)

		if not hooks.success then return end

		---@diagnostic disable-next-line: assign-type-mismatch
		playerInv:openInventory(playerInv)
		playerInv.currentShop = shop.id
	end

	return { label = playerInv.label, type = playerInv.type, slots = playerInv.slots, weight = playerInv.weight, maxWeight = playerInv.maxWeight }, shop
end)

local function canAffordItem(inv, currency, price)
	local canAfford = price >= 0 and Inventory.GetItemCount(inv, currency) >= price

	return canAfford or {
		type = 'error',
		description = locale('cannot_afford', ('%s%s'):format((currency == 'money' and locale('$') or math.groupdigits(price)), (currency == 'money' and math.groupdigits(price) or ' '..Items(currency).label)))
	}
end

local function removeCurrency(inv, currency, price)
	Inventory.RemoveItem(inv, currency, price)
end

local function isRequiredGrade(grade, rank)
	if type(grade) == "table" then
		for i=1, #grade do
			if grade[i] == rank then
				return true
			end
		end
		return false
	else
		return rank >= grade
	end
end

lib.callback.register('ox_inventory:buyItem', function(source, data)
	if data.toType == 'player' then
		data.count = math.max(1, math.floor(data.count or 1))

		if Utility.bySlot[data.toSlot] then return false end

		local playerInv = Inventory(source)

		if not playerInv or not playerInv.currentShop then return end

		local shopType, shopId = playerInv.currentShop:match('^(.-) (%d-)$')

		if not shopType then shopType = playerInv.currentShop end

		if shopId then shopId = tonumber(shopId) end

		local shop = shopId and Shops[shopType][shopId] or Shops[shopType]
		local fromData = shop.items[data.fromSlot]
		local toData = playerInv.items[data.toSlot]

		if fromData then
			if fromData.count then
				if fromData.count < 1 then
					return false, false, { type = 'error', description = locale('shop_nostock') }
				elseif data.count > fromData.count then
					data.count = fromData.count
				end
			end

			if fromData.license and server.hasLicense and not server.hasLicense(playerInv, fromData.license) then
				return false, false, { type = 'error', description = locale('item_unlicensed') }
			end

			if fromData.grade then
				local _, rank = server.hasGroup(playerInv, shop.groups)
				if not isRequiredGrade(fromData.grade, rank) then
					return false, false, { type = 'error', description = locale('stash_lowgrade') }
				end
			end

			local currency = fromData.currency or 'money'
			local fromItem = Items(fromData.name)

			local result = fromItem.cb and fromItem.cb('buying', fromItem, playerInv, data.fromSlot, shop)
			if result == false then return false end

			local toItem = toData and Items(toData.name)

			local metadata, count = Items.Metadata(playerInv, fromItem, fromData.metadata and table.clone(fromData.metadata) or {}, data.count)
			local price = count * fromData.price

			if toData == nil or (fromItem.name == toItem?.name and fromItem.stack and table.matches(toData.metadata, metadata)) then
				local newWeight = playerInv.weight + (fromItem.weight + (metadata?.weight or 0)) * count

				if newWeight > playerInv.maxWeight then
					return false, false, { type = 'error', description = locale('cannot_carry') }
				end

				local canAfford = canAffordItem(playerInv, currency, price)

				if canAfford ~= true then
					return false, false, canAfford
				end

				if fromData.count then
					fromData.count -= count
				end

				local hooks <close> = TriggerEventHooks('buyItem', {
					source = source,
					shopType = shopType,
					shopId = shopId,
					toInventory = playerInv.id,
					toSlot = data.toSlot,
					fromSlot = fromData,
					itemName = fromData.name,
					metadata = metadata,
					count = count,
					price = fromData.price,
					totalPrice = price,
					currency = currency,
				})

				if not hooks.success or not Inventory.SetSlot(playerInv, fromItem, count, metadata, data.toSlot) then
					if fromData.count then
						fromData.count += count
					end

					return false
				end

				playerInv.weight = newWeight
				removeCurrency(playerInv, currency, price)

				if server.syncInventory then server.syncInventory(playerInv) end

				local message = locale('purchased_for', count, metadata?.label or fromItem.label, (currency == 'money' and locale('$') or math.groupdigits(price)), (currency == 'money' and math.groupdigits(price) or ' '..Items(currency).label))

				if server.loglevel > 0 then
					if server.loglevel > 1 or fromData.price >= 500 then
						lib.logger(playerInv.owner, 'buyItem', ('"%s" %s'):format(playerInv.label, message:lower()), ('shop:%s'):format(shop.label))
					end
				end

				return true, {data.toSlot, playerInv.items[data.toSlot], shop.items[data.fromSlot].count and shop.items[data.fromSlot], playerInv.weight}, { type = 'success', description = message }
			end

			return false, false, { type = 'error', description = locale('unable_stack_items') }
		end
	end
end)

---@param playerInv OxInventory
---@return OxShop?, string?, number?
local function getCurrentShop(playerInv)
	local shopType, shopId = playerInv.currentShop:match('^(.-) (%d-)$')

	if not shopType then shopType = playerInv.currentShop end
	if shopId then shopId = tonumber(shopId) end

	local shops = Shops[shopType]

	return shopId and shops and shops[shopId] or shops, shopType, shopId
end

---@param inv OxInventory
local function canPayByCard(inv)
	if not server.cardpayment or not server.getBankBalance or not server.removeBankMoney then return false end

	return server.carditem == '' or Inventory.GetItemCount(inv, server.carditem) > 0
end

local function formatPrice(currency, amount)
	return currency == 'money' and ('%s%s'):format(locale('$'), math.groupdigits(amount))
		or ('%s %s'):format(math.groupdigits(amount), Items(currency)?.label or currency)
end

---Wallet and bank figures for the shop's checkout panel.
lib.callback.register('ox_inventory:getShopBalance', function(source)
	local playerInv = Inventory(source)

	if not playerInv or not playerInv.currentShop then return end

	local card = canPayByCard(playerInv)

	return {
		card = card,
		bank = card and server.getBankBalance(playerInv) or nil,
	}
end)

---Buys every line of a cart in one go. Nothing is charged unless the whole cart can be paid
---for and carried; a line that still fails to land (or is rejected by a hook) is refunded.
---@param data { items: { slot: number, count: number }[], method: 'cash' | 'card' }
lib.callback.register('ox_inventory:buyCart', function(source, data)
	local playerInv = Inventory(source)

	if not playerInv or not playerInv.currentShop or type(data) ~= 'table' or type(data.items) ~= 'table' then return false end

	local shop, shopType, shopId = getCurrentShop(playerInv)

	if not shop then return false end

	local byCard = data.method == 'card'

	if byCard and not canPayByCard(playerInv) then
		return false, false, { type = 'error', description = locale('card_unavailable') }
	end

	-- merge repeated slots and drop anything malformed
	local wanted = {}

	for i = 1, math.min(#data.items, 50) do
		local entry = data.items[i]
		local slot = type(entry) == 'table' and tonumber(entry.slot)
		local count = type(entry) == 'table' and math.floor(tonumber(entry.count) or 0) or 0

		if slot and count > 0 then wanted[slot] = (wanted[slot] or 0) + count end
	end

	local lines, cashTotals, bankTotal, addedWeight = {}, {}, 0, 0

	for slot, requested in pairs(wanted) do
		local fromData = shop.items[slot]

		if not fromData then return false end

		if fromData.count and fromData.count < requested then
			return false, false, { type = 'error', description = locale('shop_nostock') }
		end

		if fromData.license and server.hasLicense and not server.hasLicense(playerInv, fromData.license) then
			return false, false, { type = 'error', description = locale('item_unlicensed') }
		end

		if fromData.grade then
			local _, rank = server.hasGroup(playerInv, shop.groups)

			if not isRequiredGrade(fromData.grade, rank) then
				return false, false, { type = 'error', description = locale('stash_lowgrade') }
			end
		end

		local fromItem = Items(fromData.name)

		if not fromItem then return false end
		if fromItem.cb and fromItem.cb('buying', fromItem, playerInv, slot, shop) == false then return false end

		local metadata, count = Items.Metadata(playerInv, fromItem, fromData.metadata and table.clone(fromData.metadata) or {}, requested)
		local currency = fromData.currency or 'money'
		local price = count * fromData.price
		local bank = byCard and currency == 'money'

		if bank then
			bankTotal += price
		else
			cashTotals[currency] = (cashTotals[currency] or 0) + price
		end

		addedWeight += (fromItem.weight + (metadata?.weight or 0)) * count

		lines[#lines + 1] = {
			slot = slot,
			fromData = fromData,
			item = fromItem,
			metadata = metadata,
			count = count,
			price = price,
			currency = currency,
			bank = bank,
		}
	end

	if #lines == 0 then return false end

	if playerInv.weight + addedWeight > playerInv.maxWeight then
		return false, false, { type = 'error', description = locale('cannot_carry') }
	end

	for i = 1, #lines do
		local line = lines[i]

		if not Inventory.CanCarryItem(playerInv, line.item, line.count, line.metadata) then
			return false, false, { type = 'error', description = locale('cannot_carry') }
		end
	end

	for currency, total in pairs(cashTotals) do
		local canAfford = canAffordItem(playerInv, currency, total)

		if canAfford ~= true then return false, false, canAfford end
	end

	if bankTotal > 0 and (server.getBankBalance(playerInv) or 0) < bankTotal then
		return false, false, { type = 'error', description = locale('card_declined', formatPrice('money', bankTotal)) }
	end

	-- every line passes its buyItem hooks before anything changes hands
	local hooks = {}

	local function closeHooks()
		for i = 1, #hooks do
			getmetatable(hooks[i]).__close(hooks[i])
		end
	end

	for i = 1, #lines do
		local line = lines[i]

		hooks[i] = TriggerEventHooks('buyItem', {
			source = source,
			shopType = shopType,
			shopId = shopId,
			toInventory = playerInv.id,
			fromSlot = line.fromData,
			itemName = line.fromData.name,
			metadata = line.metadata,
			count = line.count,
			price = line.fromData.price,
			totalPrice = line.price,
			currency = line.currency,
			paymentMethod = line.bank and 'card' or 'cash',
		})

		if not hooks[i].success then
			closeHooks()
			return false
		end
	end

	local reason = ('%s purchase'):format(shop.label or shopType)

	if bankTotal > 0 and not server.removeBankMoney(playerInv, bankTotal, reason) then
		for i = 1, #hooks do hooks[i].success = false end
		closeHooks()
		return false, false, { type = 'error', description = locale('card_declined', formatPrice('money', bankTotal)) }
	end

	for currency, total in pairs(cashTotals) do
		removeCurrency(playerInv, currency, total)
	end

	local updatedSlots, bought, spent = {}, 0, {}

	for i = 1, #lines do
		local line = lines[i]
		local success = Inventory.AddItem(playerInv, line.item, line.count, line.metadata)

		if success then
			if line.fromData.count then
				line.fromData.count -= line.count
				updatedSlots[#updatedSlots + 1] = line.fromData
			end

			bought += line.count
			spent[line.currency] = (spent[line.currency] or 0) + line.price
		else
			hooks[i].success = false

			if line.bank then
				if server.addBankMoney then server.addBankMoney(playerInv, line.price, ('%s refund'):format(reason)) end
			else
				Inventory.AddItem(playerInv, line.currency, line.price)
			end
		end
	end

	closeHooks()

	if server.syncInventory then server.syncInventory(playerInv) end

	if bought == 0 then
		return false, false, { type = 'error', description = locale('cannot_carry') }
	end

	local paid = {}

	for currency, amount in pairs(spent) do
		paid[#paid + 1] = formatPrice(currency, amount)
	end

	local message = locale(byCard and bankTotal > 0 and 'purchased_cart_card' or 'purchased_cart', bought, table.concat(paid, ', '))

	if server.loglevel > 0 then
		lib.logger(playerInv.owner, 'buyCart', ('"%s" %s'):format(playerInv.label, message:lower()), ('shop:%s'):format(shop.label))
	end

	return true, updatedSlots, { type = 'success', description = message }
end)

server.shops = Shops
