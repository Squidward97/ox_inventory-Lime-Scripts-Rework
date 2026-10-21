if not lib then return end

-- Weapon inspection inside the open inventory. The UI swaps its right column for an inspect panel
-- with a see-through window; here the weapon is spawned as a frozen world object with its
-- attachments, filmed side-on by a scripted camera aimed so the weapon lands in that window, and
-- each attachment point is projected to the screen so the UI can pin its label on it.
-- Attaching and removing go through the existing ox_inventory:updateWeapon callback.

local Items = require 'modules.items.client'
local Utils = require 'modules.utils.client'

local Inspect = {}

local inspecting = false
local activeSlot ---@type number?
local previewObject = 0
local previewCam = 0
local baseHeading = 0.0
local rotateHeading = 0.0
---@type { x: number, y: number, w: number, h: number }? the UI window, as fractions of the screen
local windowRect

-- vertical field of view of the camera; wide enough that even long rifles sit close to the lens
local CAMERA_FOV = 50.0
-- share of the window the weapon spans
local FILL = 0.7
local CAMERA_EASE = 300

-- Attachment slots: the component item type each takes and the weapon model bones it sits on
-- (the first bone the model has wins). Finish has no bone; its pin goes on the weapon's centre.
local slotDefs = {
	{ id = 'muzzle', label = 'Muzzle', type = 'muzzle', bones = { 'WAPSupp', 'WAPSupp_2' } },
	{ id = 'sight', label = 'Sight', type = 'sight', bones = { 'WAPScop', 'WAPScop_2' } },
	{ id = 'flashlight', label = 'Flashlight', type = 'flashlight', bones = { 'WAPFlshLasr', 'WAPFlshLasr_2', 'WAPFlsh' } },
	{ id = 'grip', label = 'Grip', type = 'grip', bones = { 'WAPGrip', 'WAPGrip_2' } },
	{ id = 'barrel', label = 'Barrel', type = 'barrel', bones = { 'WAPBarrel' } },
	{ id = 'magazine', label = 'Magazine', type = 'magazine', bones = { 'WAPClip', 'WAPClip_2' } },
	{ id = 'skin', label = 'Finish', type = 'skin' },
}

---@return number?
local function compatibleComponentHash(weaponHash, componentItem)
	local hashes = componentItem.client?.component
	if not hashes then return end

	for i = 1, #hashes do
		if DoesWeaponTakeWeaponComponent(weaponHash, hashes[i]) then
			return hashes[i]
		end
	end
end

local function weaponTakesType(weaponHash, componentType)
	for _, item in pairs(Items) do
		if type(item) == 'table' and item.component and item.type == componentType and compatibleComponentHash(weaponHash, item) then
			return true
		end
	end

	return false
end

-- GetWeaponHudStats has no usable out-struct from Lua; invoking the native with our own blob works.
local function readHudStats(weaponHash)
	if not string.blob then return end

	local blob = string.blob(40)
	if not Citizen.InvokeNative(0xD92C739EE34C9EBA, weaponHash, blob) then return end

	local damage = blob:blob_unpack(1, '<I1')
	local fireRate = blob:blob_unpack(9, '<I1')
	local accuracy = blob:blob_unpack(25, '<I1')
	local range = blob:blob_unpack(33, '<I1')

	if damage == 0 and fireRate == 0 and accuracy == 0 and range == 0 then return end

	return damage, fireRate, accuracy, range
end

---@return table? state for the UI, or nil when the slot no longer holds an inspectable weapon
local function buildState(slot)
	local item = PlayerData.inventory[slot]
	local data = item and Items[item.name]
	if not data?.weapon or data.throwable then return end

	local metadata = item.metadata or {}
	local attachedByType = {}

	for _, name in ipairs(metadata.components or {}) do
		local component = Items[name]
		if component?.type then
			attachedByType[component.type] = { name = name, label = component.label }
		end
	end

	local slots = {}

	for _, def in ipairs(slotDefs) do
		if not weaponTakesType(data.hash, def.type) then goto continue end

		local available = {}

		for invSlot, invItem in pairs(PlayerData.inventory) do
			local invData = invItem?.name and Items[invItem.name]

			if invData?.component and invData.type == def.type and compatibleComponentHash(data.hash, invData) then
				available[#available + 1] = {
					slot = invSlot,
					name = invItem.name,
					label = invItem.metadata?.label or invData.label,
					count = invItem.count,
				}
			end
		end

		table.sort(available, function(a, b) return a.label < b.label end)

		slots[#slots + 1] = {
			id = def.id,
			label = def.label,
			attached = attachedByType[def.type],
			available = available,
		}

		::continue::
	end

	local ammoType = data.ammoname and (Items[data.ammoname]?.label or data.ammoname)
	local damage, fireRate, accuracy, range = readHudStats(data.hash)

	return {
		slot = slot,
		name = item.name,
		label = metadata.label or data.label,
		serial = metadata.serial,
		durability = metadata.durability,
		ammo = metadata.ammo,
		ammoType = ammoType,
		tint = metadata.weapontint,
		damage = damage,
		fireRate = fireRate,
		accuracy = accuracy,
		range = range,
		slots = slots,
	}
end

local function ensureWeaponAsset(weaponHash)
	if HasWeaponAssetLoaded(weaponHash) then return true end

	RequestWeaponAsset(weaponHash, 31, 0)

	local timeout = GetGameTimer() + 5000
	while not HasWeaponAssetLoaded(weaponHash) and GetGameTimer() < timeout do
		Wait(0)
	end

	return HasWeaponAssetLoaded(weaponHash)
end

-- how far the camera sits so the weapon spans FILL of the window
local function cameraDistance(model)
	local min, max = GetModelDimensions(model)
	local length = math.max(max.x - min.x, max.y - min.y, 0.15)
	local height = math.max(max.z - min.z, 0.08)
	local tanV = math.tan(math.rad(CAMERA_FOV / 2))
	local tanH = tanV * GetAspectRatio(false)
	local rect = windowRect or { w = 0.3, h = 0.4 }

	return math.max(length / (rect.w * FILL * 2 * tanH), height / (rect.h * FILL * 2 * tanV))
end

local function deletePreview()
	if previewCam ~= 0 then
		RenderScriptCams(false, true, CAMERA_EASE, true, true)
		DestroyCam(previewCam, false)
		previewCam = 0
	end

	if previewObject ~= 0 and DoesEntityExist(previewObject) then
		DeleteObject(previewObject)
	end

	previewObject = 0
	ClearFocus()
end

local function spawnObject(weaponHash, metadata, coords)
	if previewObject ~= 0 and DoesEntityExist(previewObject) then
		DeleteObject(previewObject)
	end

	previewObject = CreateWeaponObject(weaponHash, 0, coords.x, coords.y, coords.z, true, 1.0, 0)

	if previewObject == 0 or not DoesEntityExist(previewObject) then
		previewObject = 0
		return false
	end

	SetEntityCollision(previewObject, false, false)
	FreezeEntityPosition(previewObject, true)
	SetEntityCoordsNoOffset(previewObject, coords.x, coords.y, coords.z, false, false, false)
	SetEntityHeading(previewObject, baseHeading + rotateHeading)

	if metadata.tint then
		SetWeaponObjectTintIndex(previewObject, metadata.tint)
	end

	for _, name in ipairs(metadata.components or {}) do
		local component = Items[name]
		local hash = component and compatibleComponentHash(weaponHash, component)

		if hash then
			GiveWeaponComponentToWeaponObject(previewObject, hash)
		end
	end

	SetFocusEntity(previewObject)
	return true
end

-- Film the weapon side-on from its +Y axis as it sat when the inspection opened, then turn the
-- camera so the weapon lands in the middle of the window rather than the middle of the screen.
local function aimCamera()
	if previewCam == 0 or previewObject == 0 then return end

	local model = GetEntityModel(previewObject)
	local min, max = GetModelDimensions(model)
	local center = GetOffsetFromEntityInWorldCoords(previewObject, (min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2)
	local heading = math.rad(baseHeading)
	local side = vector3(-math.sin(heading), math.cos(heading), 0.0)
	local camCoords = center + side * cameraDistance(model)

	local delta = center - camCoords
	local yaw = math.deg(math.atan(-delta.x, delta.y))
	local pitch = math.deg(math.atan(delta.z, math.sqrt(delta.x * delta.x + delta.y * delta.y)))

	if windowRect then
		local tanV = math.tan(math.rad(CAMERA_FOV / 2))
		local tanH = tanV * GetAspectRatio(false)
		local u = (windowRect.x + windowRect.w / 2 - 0.5) * 2
		local v = (windowRect.y + windowRect.h / 2 - 0.5) * 2

		yaw = yaw + math.deg(math.atan(u * tanH))
		pitch = pitch + math.deg(math.atan(v * tanV))
	end

	SetCamCoord(previewCam, camCoords.x, camCoords.y, camCoords.z)
	SetCamRot(previewCam, pitch, 0.0, yaw, 2)
	SetCamFov(previewCam, CAMERA_FOV)
end

local function spawnPreview(weaponHash, metadata)
	deletePreview()
	if not ensureWeaponAsset(weaponHash) then return false end

	-- the camera sits between the player and the weapon, looking away from the player, so the
	-- weapon is placed far enough out for that gap
	local ped = cache.ped
	local forward = GetEntityForwardVector(ped)
	local distance = cameraDistance(GetWeapontypeModel(weaponHash))
	local coords = GetEntityCoords(ped) + forward * (distance + 0.9) + vector3(0.0, 0.0, 0.45)

	baseHeading = GetEntityHeading(ped) + 180.0
	rotateHeading = 0.0

	if not spawnObject(weaponHash, metadata, coords) then return false end

	previewCam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
	aimCamera()
	SetCamActive(previewCam, true)
	RenderScriptCams(true, true, CAMERA_EASE, true, true)

	return true
end

local function sendPins()
	if not inspecting or previewObject == 0 or not DoesEntityExist(previewObject) then return end

	local pins = {}
	local min, max = GetModelDimensions(GetEntityModel(previewObject))

	for _, def in ipairs(slotDefs) do
		local position

		if def.bones then
			for _, bone in ipairs(def.bones) do
				local index = GetEntityBoneIndexByName(previewObject, bone)

				if index ~= -1 then
					position = GetWorldPositionOfEntityBone(previewObject, index)
					break
				end
			end
		else
			position = GetOffsetFromEntityInWorldCoords(previewObject, (min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2)
		end

		if position then
			local onScreen, x, y = GetScreenCoordFromWorldCoord(position.x, position.y, position.z)

			if onScreen then
				pins[#pins + 1] = { id = def.id, x = x, y = y }
			end
		end
	end

	SendNUIMessage({ action = 'inspectPins', data = pins })
end

-- pins read the rendered camera, so wait for the ease (or a fresh object) to settle first
local function sendPinsSoon(delay)
	SetTimeout(delay or 0, sendPins)
end

local function refreshObject()
	local weapon = activeSlot and PlayerData.inventory[activeSlot]
	local data = weapon and Items[weapon.name]
	if not data or previewObject == 0 then return end

	spawnObject(data.hash, weapon.metadata or {}, GetEntityCoords(previewObject))
	sendPinsSoon(50)
end

---@param slot number
---@param rect { x: number, y: number, w: number, h: number }?
---@param equippedSlot number? the slot of the weapon in the player's hands
---@return table? state
function Inspect.open(slot, rect, equippedSlot)
	if inspecting then Inspect.close(true) end

	local item = PlayerData.inventory[slot]
	local data = item and Items[item.name]
	if not data?.weapon or data.throwable then return end

	-- holster it, so the weapon in hand never goes out of sync with its attachments
	if equippedSlot == slot then
		TriggerEvent('ox_inventory:disarm', true)
	end

	local state = buildState(slot)
	if not state then return end

	windowRect = rect
	activeSlot = slot
	inspecting = true

	if not spawnPreview(data.hash, item.metadata or {}) then
		Inspect.close(true)
		return
	end

	Utils.blurOut()
	sendPinsSoon(CAMERA_EASE + 50)

	return state
end

---@param keepBlur boolean? true when the inventory is closing anyway
function Inspect.close(keepBlur)
	if not inspecting then return end

	inspecting = false
	activeSlot = nil
	windowRect = nil
	deletePreview()

	if not keepBlur and client.screenblur then Utils.blurIn() end
end

function Inspect.isOpen()
	return inspecting
end

RegisterNUICallback('inspectClose', function(_, cb)
	Inspect.close()
	cb(1)
end)

-- the UI asks again when the pockets change, so the attachments on offer stay current
RegisterNUICallback('inspectState', function(_, cb)
	cb(inspecting and activeSlot and buildState(activeSlot) or false)
end)

RegisterNUICallback('inspectRotate', function(data, cb)
	cb(1)
	if not inspecting or previewObject == 0 then return end

	rotateHeading = rotateHeading + (tonumber(data?.delta) or 0)
	SetEntityHeading(previewObject, baseHeading + rotateHeading)
	sendPins()
end)

RegisterNUICallback('inspectRect', function(rect, cb)
	cb(1)
	if not inspecting or type(rect) ~= 'table' then return end

	windowRect = rect
	aimCamera()
	sendPinsSoon(50)
end)

RegisterNUICallback('inspectApply', function(data, cb)
	if not inspecting or not activeSlot or type(data?.slot) ~= 'number' then return cb(false) end

	local weapon = PlayerData.inventory[activeSlot]
	local component = PlayerData.inventory[data.slot]
	local weaponData = weapon and Items[weapon.name]
	local componentData = component and Items[component.name]

	if not weaponData?.weapon or not componentData?.component or not compatibleComponentHash(weaponData.hash, componentData) then
		return cb(false)
	end

	for _, name in ipairs(weapon.metadata?.components or {}) do
		if Items[name]?.type == componentData.type then
			lib.notify({ id = 'component_slot_occupied', type = 'error', description = locale('component_slot_occupied', componentData.type) })
			return cb(false)
		end
	end

	if not lib.callback.await('ox_inventory:updateWeapon', false, 'component', tostring(data.slot), activeSlot) then
		return cb(false)
	end

	-- the slot sync from the server lands just after the callback returns
	Wait(50)
	refreshObject()
	cb(buildState(activeSlot) or false)
end)

RegisterNUICallback('inspectRemove', function(data, cb)
	if not inspecting or not activeSlot or type(data?.component) ~= 'string' then return cb(false) end

	if not lib.callback.await('ox_inventory:updateWeapon', false, 'component', { slot = activeSlot, component = data.component }) then
		return cb(false)
	end

	Wait(50)
	refreshObject()
	cb(buildState(activeSlot) or false)
end)

AddEventHandler('onResourceStop', function(resource)
	if resource == cache.resource then
		Inspect.close(true)
	end
end)

return Inspect
