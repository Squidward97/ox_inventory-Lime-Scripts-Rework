if not lib then return end

-- Weapon inspection inside the open inventory. The UI swaps its right column for an inspect panel
-- with a see-through window; here the weapon is spawned as a frozen world object with its
-- attachments, filmed side-on by a scripted camera aimed so the weapon lands in that window, and
-- each attachment point is projected to the screen so the UI can pin its label on it.
-- The UI can't be drawn under a world object, so instead the inventory's backdrop is drawn behind
-- the weapon: the UI page loaded again as a DUI (#backdrop=, web/src/main.tsx), on a quad that fills
-- the camera's view just past the weapon. Through the window the weapon then sits on the backdrop.
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
-- where the camera sits and how it is turned, for the backdrop quad
local camState ---@type { coords: vector3, pitch: number, yaw: number, distance: number }?

-- vertical field of view of the camera; wide enough that even long rifles sit close to the lens
local CAMERA_FOV = 50.0
-- share of the window the weapon spans
local FILL = 0.7
-- easing back to the gameplay camera on close; opening cuts, as the backdrop hides the world anyway
local CAMERA_EASE = 300
-- key light from the camera, so the weapon stays lit against the backdrop at night; 0 turns it off
local LIGHT_INTENSITY = 1.0
-- multiplies the backdrop's colour, to pull it back in line should the game's grading shift it
local BACKDROP_TINT = { 255, 255, 255 }

local BACKDROP_TXD = 'ox_inventory_inspect'
local backdropDui ---@type number?
local backdropTheme ---@type string?
local backdropSize = { 0, 0 }
local backdropTexture ---@type string?
local backdropCount = 0
local backdropTxd ---@type number? the runtime dictionary's handle, which textures are made in
-- each draw loop runs only while its own inspection does
local drawToken = 0

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
	camState = nil
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

	camState = { coords = camCoords, pitch = pitch, yaw = yaw, distance = #delta }
end

local function uiStyle()
	return GetResourceKvpString('uistyle') or client.uistyle
end

-- The backdrop DUI is made on the first inspection and kept for the next ones; it's remade only
-- when the screen resolution changes, so it always maps onto the screen pixel for pixel.
local function ensureBackdrop()
	local theme = uiStyle()
	local width, height = GetActiveScreenResolution()

	if backdropDui and (backdropSize[1] ~= width or backdropSize[2] ~= height) then
		DestroyDui(backdropDui)
		backdropDui = nil
		backdropTexture = nil
	end

	if backdropDui then
		if theme ~= backdropTheme then
			SendDuiMessage(backdropDui, json.encode({ uistyle = theme }))
			backdropTheme = theme
		end

		return true
	end

	-- the NUI's own origin, so the page loads just as the inventory's does
	backdropDui = CreateDui(('https://cfx-nui-%s/web/build/index.html#backdrop=%s'):format(cache.resource, theme), width, height)
	backdropTheme = theme
	backdropSize = { width, height }

	local timeout = GetGameTimer() + 3000
	while not IsDuiAvailable(backdropDui) and GetGameTimer() < timeout do
		Wait(0)
	end

	if not IsDuiAvailable(backdropDui) then
		DestroyDui(backdropDui)
		backdropDui = nil
		return false
	end

	backdropTxd = backdropTxd or CreateRuntimeTxd(BACKDROP_TXD)
	backdropCount = backdropCount + 1
	backdropTexture = ('backdrop%d'):format(backdropCount)
	CreateRuntimeTextureFromDuiHandle(backdropTxd, backdropTexture, GetDuiHandle(backdropDui))

	-- available means the browser is up, not that the page has painted yet
	Wait(250)
	return true
end

local function drawTriangle(a, b, c, uvA, uvB, uvC)
	DrawSpritePoly(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z,
		BACKDROP_TINT[1], BACKDROP_TINT[2], BACKDROP_TINT[3], 255, BACKDROP_TXD, backdropTexture,
		uvA[1], uvA[2], 1.0, uvB[1], uvB[2], 1.0, uvC[1], uvC[2], 1.0)
end

-- one frame of the backdrop quad and the key light
local function drawBackdrop()
	if not camState or previewObject == 0 then return end

	local pitch, yaw = math.rad(camState.pitch), math.rad(camState.yaw)
	local forward = vector3(-math.sin(yaw) * math.cos(pitch), math.cos(yaw) * math.cos(pitch), math.sin(pitch))
	local right = vector3(math.cos(yaw), math.sin(yaw), 0.0)
	local up = vector3(
		right.y * forward.z - right.z * forward.y,
		right.z * forward.x - right.x * forward.z,
		right.x * forward.y - right.y * forward.x
	)

	if backdropTexture then
		-- just past the weapon however it's turned, so nearby walls don't come between
		local min, max = GetModelDimensions(GetEntityModel(previewObject))
		local depth = camState.distance + #(max - min) / 2 + 0.1
		local halfH = depth * math.tan(math.rad(CAMERA_FOV / 2))
		local halfW = halfH * GetAspectRatio(false)
		local centre = camState.coords + forward * depth

		local tl = centre - right * halfW + up * halfH
		local tr = centre + right * halfW + up * halfH
		local bl = centre - right * halfW - up * halfH
		local br = centre + right * halfW - up * halfH

		-- both windings, as a poly only shows from one side
		drawTriangle(tl, tr, br, { 0.0, 0.0 }, { 1.0, 0.0 }, { 1.0, 1.0 })
		drawTriangle(tl, br, bl, { 0.0, 0.0 }, { 1.0, 1.0 }, { 0.0, 1.0 })
		drawTriangle(tl, br, tr, { 0.0, 0.0 }, { 1.0, 1.0 }, { 1.0, 0.0 })
		drawTriangle(tl, bl, br, { 0.0, 0.0 }, { 0.0, 1.0 }, { 1.0, 1.0 })
	end

	if LIGHT_INTENSITY > 0 then
		local light = camState.coords + up * 0.3
		DrawLightWithRange(light.x, light.y, light.z, 255, 255, 255, camState.distance + 0.5, LIGHT_INTENSITY)
	end
end

local function startDrawing()
	drawToken = drawToken + 1
	local token = drawToken

	CreateThread(function()
		while token == drawToken do
			drawBackdrop()
			Wait(0)
		end
	end)
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
	RenderScriptCams(true, false, 0, true, true)

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

	-- without the backdrop the window still works, it just shows the world behind the weapon
	ensureBackdrop()
	if not inspecting then return end

	if not spawnPreview(data.hash, item.metadata or {}) then
		Inspect.close(true)
		return
	end

	startDrawing()
	Utils.blurOut()
	sendPinsSoon(50)

	return state
end

---@param keepBlur boolean? true when the inventory is closing anyway
function Inspect.close(keepBlur)
	if not inspecting then return end

	inspecting = false
	activeSlot = nil
	windowRect = nil
	drawToken = drawToken + 1
	deletePreview()

	if not keepBlur and client.screenblur then Utils.blurIn() end
end

function Inspect.isOpen()
	return inspecting
end

-- the player switched theme: the backdrop follows, even mid-inspection
function Inspect.setUiStyle(style)
	if backdropDui and style ~= backdropTheme then
		SendDuiMessage(backdropDui, json.encode({ uistyle = style }))
		backdropTheme = style
	end
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
		if backdropDui then DestroyDui(backdropDui) end
	end
end)

return Inspect
