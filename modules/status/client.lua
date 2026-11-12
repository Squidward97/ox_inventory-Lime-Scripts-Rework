-- DPS Inventory: the self status panel.
-- While the inventory is open this sends the player's own condition to the screen: vitals as
-- meters, injuries drawn on the body figure, and a short list of what is wrong.
--
-- Built in: health, armour and oxygen (natives); hunger, thirst and stress (player statebags, as
-- set by qbx_core); limb injuries, bleeding and the death state from wasabi_ambulance, if it runs.
-- Anything else comes from other resources through the `setStatusLines` export (see README.md).

if not lib then return end

local Status = {}
local enabled = GetConvarInt('inventory:statuspanel', 1) == 1
local refresh = math.max(250, GetConvarInt('inventory:statusrefresh', 1000))

local open = false
local limbs = {}
local effects = {}
---@type table<string, { label: string, severity?: number }[]>
local provided = {}

-- wasabi_ambulance limb order, and the part of the body figure each one lights up
local PARTS = { 'HEAD', 'UPPER_BODY', 'LARM', 'RARM', 'LLEG', 'RLEG' }
local PART_LOCALE = { 'status_head', 'status_body', 'status_left_arm', 'status_right_arm', 'status_left_leg', 'status_right_leg' }
local SERIOUS = { gunshot = true, brokenbone = true, burn = true }

local function clamp(value)
	return math.max(0, math.min(100, math.floor(value + 0.5)))
end

local function text(key, fallback)
	local value = locale(key)
	return (value and value ~= key) and value or fallback
end

local function injuryName(kind)
	return text(('status_injury_%s'):format(kind), kind)
end

---@return table<string, { severity: number, label: string }>, { label: string, severity: number }[]
local function readLimbs()
	local injuries, lines = {}, {}

	for i = 1, #PARTS do
		local limb = limbs[i]
		local list = type(limb) == 'table' and limb.injuries

		if type(list) == 'table' then
			local total, serious, names = 0, false, {}

			for kind, count in pairs(list) do
				count = tonumber(count) or 0

				if count > 0 then
					total += count
					serious = serious or SERIOUS[kind] or false
					names[#names + 1] = count > 1 and ('%s x%d'):format(injuryName(kind), count) or injuryName(kind)
				end
			end

			if total > 0 then
				local severity = total >= 7 and 4 or total >= 4 and 3 or total >= 2 and 2 or 1
				if serious and severity < 3 then severity = 3 end

				table.sort(names)

				local label = table.concat(names, ', ')
				injuries[PARTS[i]] = { severity = severity, label = label }
				lines[#lines + 1] = { label = ('%s: %s'):format(text(PART_LOCALE[i], PARTS[i]), label), severity = severity }
			end
		end
	end

	return injuries, lines
end

local function build()
	local ped = cache.ped
	local state = LocalPlayer.state
	local maxHealth = GetEntityMaxHealth(ped)
	local health = maxHealth > 100 and clamp((GetEntityHealth(ped) - 100) / (maxHealth - 100) * 100) or 0

	local vitals = {
		{ key = 'health', label = text('status_health', 'Health'), value = health },
		{ key = 'armour', label = text('status_armour', 'Armour'), value = clamp(GetPedArmour(ped)) },
	}

	-- only shown when the framework keeps them (qbx_core does, as replicated statebags)
	if type(state.hunger) == 'number' then
		vitals[#vitals + 1] = { key = 'hunger', label = text('status_hunger', 'Food'), value = clamp(state.hunger) }
	end

	if type(state.thirst) == 'number' then
		vitals[#vitals + 1] = { key = 'thirst', label = text('status_thirst', 'Water'), value = clamp(state.thirst) }
	end

	if type(state.stress) == 'number' then
		vitals[#vitals + 1] = { key = 'stress', label = text('status_stress', 'Stress'), value = clamp(state.stress), highIsBad = true }
	end

	if IsPedSwimmingUnderWater(ped) then
		vitals[#vitals + 1] = { key = 'oxygen', label = text('status_oxygen', 'Air'), value = clamp(GetPlayerUnderwaterTimeRemaining(cache.playerId) * 10) }
	end

	local injuries, limbLines = readLimbs()
	local lines = {}

	local death = state['wasabi:deathState']

	if death == 2 or (death == nil and (state.dead or state.isDead)) then
		lines[#lines + 1] = { label = text('status_dead', 'Unconscious'), severity = 4 }
	elseif death == 1 then
		lines[#lines + 1] = { label = text('status_laststand', 'Critically hurt'), severity = 4 }
	end

	local bleed = tonumber(effects.bleed) or 0

	if bleed >= 66 then
		lines[#lines + 1] = { label = text('status_bleed_heavy', 'Bleeding heavily'), severity = 4 }
	elseif bleed >= 33 then
		lines[#lines + 1] = { label = text('status_bleed_moderate', 'Bleeding'), severity = 3 }
	elseif bleed >= 1 then
		lines[#lines + 1] = { label = text('status_bleed_light', 'Bleeding lightly'), severity = 2 }
	end

	if (tonumber(effects.stun) or 0) > 0 then
		lines[#lines + 1] = { label = text('status_stunned', 'Dazed'), severity = 2 }
	end

	for i = 1, #limbLines do lines[#lines + 1] = limbLines[i] end

	for _, list in pairs(provided) do
		for i = 1, #list do lines[#lines + 1] = list[i] end
	end

	return { vitals = vitals, injuries = injuries, lines = lines, healthPercent = health }
end

local function push()
	if open then SendNUIMessage({ action = 'updateStatus', data = build() }) end
end

function Status.open()
	if not enabled or open then return end

	open = true

	-- other resources answer this with exports.ox_inventory:setStatusLines(...)
	TriggerEvent('ox_inventory:statusOpened')

	CreateThread(function()
		while open do
			push()
			Wait(refresh)
		end
	end)
end

function Status.close()
	open = false
end

AddEventHandler('wasabi_ambulance:Client:Listeners:OnInjuryUpdate', function(data)
	limbs = type(data) == 'table' and data or {}
	push()
end)

AddEventHandler('wasabi_ambulance:Client:Listeners:OnStatusChange', function(kind, amount)
	if type(kind) ~= 'string' then return end

	effects[kind] = amount
	push()
end)

AddEventHandler('wasabi_ambulance:Client:OnRevive', function()
	limbs, effects = {}, {}
	push()
end)

---Lines another resource adds to the status list. Each call replaces that resource's earlier lines;
---pass nil or an empty table to clear them.
---@param lines? { label: string, severity?: number }[] severity 0 (note) to 4 (critical)
exports('setStatusLines', function(lines)
	local resource = GetInvokingResource() or cache.resource
	local clean = {}

	if type(lines) == 'table' then
		for i = 1, math.min(#lines, 12) do
			local line = lines[i]

			if type(line) == 'table' and type(line.label) == 'string' then
				clean[#clean + 1] = { label = line.label:sub(1, 80), severity = math.max(0, math.min(4, math.floor(tonumber(line.severity) or 0))) }
			end
		end
	end

	provided[resource] = #clean > 0 and clean or nil
	push()
end)

AddEventHandler('onClientResourceStop', function(resource)
	if provided[resource] then
		provided[resource] = nil
		push()
	end
end)

return Status
