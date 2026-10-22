if not lib then return end

-- Weapon and item inspection inside the open inventory. The UI swaps its right column for an
-- inspect panel with a see-through window; here the weapon is spawned as a frozen world object with
-- its attachments, filmed side-on by a scripted camera aimed so the weapon lands in that window, and
-- each attachment point is projected to the screen so the UI can pin its label on it. Any other item
-- with a `prop` in data/items.lua is filmed the same way as that model, without the weapon extras.
-- The UI can't be drawn under a world object, so instead the inventory's backdrop is drawn behind
-- the weapon: the UI page loaded again as a DUI (#backdrop=, web/src/main.tsx), drawn full-screen and
-- see-through like the UI's own, which the UI hides meanwhile (see drawBackdrop for how it's laid).
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
-- the model being inspected when it's an item rather than a weapon
local activeProp ---@type { model: number, rotation: vector3?, zoom: number }?
-- A prop turns freely, round its own centre: its axes in the world (as columns), the world point
-- its centre stays on, and where that centre sits in the model.
local propAxes ---@type { x: vector3, y: vector3, z: vector3 }?
local propPivot ---@type vector3?
local propCentre ---@type vector3?
-- scroll zoom, as a narrower field of view (a prop's `zoom` is where it starts)
local zoom = 1.0
-- where the camera sits and how it is turned, for the backdrop quad
local camState ---@type { coords: vector3, pitch: number, yaw: number, distance: number, fov: number }?

-- vertical field of view of the camera; wide enough that even long rifles sit close to the lens
local CAMERA_FOV = 50.0
-- share of the window the weapon spans
local FILL = 0.7
-- how far scroll zoom goes, and how much one notch does
local ZOOM_MIN, ZOOM_MAX, ZOOM_STEP = 0.7, 4.0, 1.12
-- easing back to the gameplay camera on close; opening cuts, so the backdrop lines up from the start
local CAMERA_EASE = 300
-- key light from the camera, so the weapon stays lit against the backdrop at night; 0 turns it off
local LIGHT_INTENSITY = 1.0
-- multiplies the backdrop's colour, to pull it back in line should the game's grading shift it
local BACKDROP_TINT = { 255, 255, 255 }
-- how far from the lens the backdrop sits round the window, in front of anything in the world
local NEAR_DEPTH = 0.4
-- Depth of field blurs the world beyond the object, as the inventory's screen blur does (which
-- would blur the object too): how strong (0 turns it off), and over how many metres past the
-- object it fades from sharp to fully blurred.
local DOF_STRENGTH = 1.0
local DOF_FALLOFF = 1.0

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

-- An item's `prop`: a model name (or hash), or { model, rotation = vec3(pitch, roll, yaw), zoom }.
-- Weapons film their own weapon object instead.
---@return { model: number, rotation: vector3?, zoom: number }?
local function propOf(data)
	local prop = data?.prop
	if not prop or data.weapon then return end
	if type(prop) ~= 'table' then prop = { model = prop } end

	local model = type(prop.model) == 'string' and joaat(prop.model) or prop.model
	if type(model) ~= 'number' then return end

	local rotation = prop.rotation

	if rotation then
		rotation = vector3(rotation.x or rotation[1] or 0.0, rotation.y or rotation[2] or 0.0, rotation.z or rotation[3] or 0.0)
	end

	return { model = model, rotation = rotation, zoom = tonumber(prop.zoom) or 1.0 }
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

---@return table? state for the UI, or nil when the slot no longer holds an inspectable weapon or item
local function buildState(slot)
	local item = PlayerData.inventory[slot]
	local data = item and Items[item.name]

	-- the UI reads an item's durability, weight and description off the slot itself
	if propOf(data) then
		return {
			kind = 'item',
			slot = slot,
			name = item.name,
			label = item.metadata?.label or data.label,
			slots = {},
		}
	end

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
		kind = 'weapon',
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

-- Rows of the rotation for (pitch, roll, yaw) in degrees: roll, then pitch, then yaw (Rz * Rx * Ry).
local function rotationRows(rotation)
	local px, py, pz = math.rad(rotation.x), math.rad(rotation.y), math.rad(rotation.z)
	local cx, sx, cy, sy, cz, sz = math.cos(px), math.sin(px), math.cos(py), math.sin(py), math.cos(pz), math.sin(pz)

	return {
		{ cz * cy - sz * sx * sy, -sz * cx, cz * sy + sz * sx * cy },
		{ sz * cy + cz * sx * sy, cz * cx, sz * sy - cz * sx * cy },
		{ -cx * sy, sx, cx * cy },
	}
end

-- The model's size along its axes as it's shown: a prop's rotation turns its box first, so the
-- frame fits what's on screen.
local function shownSize(model)
	local min, max = GetModelDimensions(model)
	local size = max - min
	local rotation = activeProp?.rotation

	if not rotation or rotation == vector3(0.0, 0.0, 0.0) then return size end

	-- a turned box spans the sum of its sides' reach along each axis
	local m = rotationRows(rotation)

	local function reach(row)
		return math.abs(row[1]) * size.x + math.abs(row[2]) * size.y + math.abs(row[3]) * size.z
	end

	return vector3(reach(m[1]), reach(m[2]), reach(m[3]))
end

-- A prop with no rotation of its own is turned so its broadest face meets the camera, which films
-- the model's +Y side: the thinnest side ends up along Y. A flat thing (a card, a note) is stood up.
local function autoRotation(model)
	local min, max = GetModelDimensions(model)
	local size = max - min

	if size.z < math.min(size.x, size.y) * 0.6 then
		return vector3(-90.0, 0.0, 0.0)
	end

	return vector3(0.0, 0.0, size.x < size.y and 90.0 or 0.0)
end

-- how far the camera sits so the weapon or prop spans FILL of the window
local function cameraDistance(model)
	local size = shownSize(model)
	local length = math.max(size.x, size.y, 0.15)
	local height = math.max(size.z, 0.08)
	local tanV = math.tan(math.rad(CAMERA_FOV / 2))
	local tanH = tanV * GetAspectRatio(false)
	local rect = windowRect or { w = 0.3, h = 0.4 }

	return math.max(length / (rect.w * FILL * 2 * tanH), height / (rect.h * FILL * 2 * tanV))
end

-- the field of view for the current zoom
local function cameraFov()
	return math.deg(2 * math.atan(math.tan(math.rad(CAMERA_FOV / 2)) / zoom))
end

-- v turned round the unit axis k by angle radians
local function turnVector(v, k, angle)
	local c, s = math.cos(angle), math.sin(angle)
	local cross = vector3(k.y * v.z - k.z * v.y, k.z * v.x - k.x * v.z, k.x * v.y - k.y * v.x)

	return v * c + cross * s + k * ((k.x * v.x + k.y * v.y + k.z * v.z) * (1 - c))
end

-- Place a prop from its axes, its centre kept on the pivot. Setting the matrix outright lets it
-- turn any way, with no Euler order to fight.
local function placeProp()
	local axes = propAxes
	local at = propPivot - (axes.x * propCentre.x + axes.y * propCentre.y + axes.z * propCentre.z)

	SetEntityMatrix(previewObject, axes.y.x, axes.y.y, axes.y.z, axes.x.x, axes.x.y, axes.x.z,
		axes.z.x, axes.z.y, axes.z.z, at.x, at.y, at.z)
end

-- A weapon spins round the vertical. A prop is set up from its own rotation, turned to face the
-- player's side, with its centre on the spawn point.
local function applyRotation(coords)
	if previewObject == 0 then return end

	if not activeProp then
		return SetEntityHeading(previewObject, baseHeading + rotateHeading)
	end

	local rotation = activeProp.rotation
	local m = rotationRows(vector3(rotation.x, rotation.y, baseHeading + rotation.z))
	local min, max = GetModelDimensions(activeProp.model)

	propAxes = {
		x = vector3(m[1][1], m[2][1], m[3][1]),
		y = vector3(m[1][2], m[2][2], m[3][2]),
		z = vector3(m[1][3], m[2][3], m[3][3]),
	}
	propPivot = coords
	propCentre = (min + max) / 2
	placeProp()
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

---@param weaponHash number? the weapon to film; nil films activeProp's model
local function spawnObject(weaponHash, metadata, coords)
	if previewObject ~= 0 and DoesEntityExist(previewObject) then
		DeleteObject(previewObject)
	end

	if weaponHash then
		previewObject = CreateWeaponObject(weaponHash, 0, coords.x, coords.y, coords.z, true, 1.0, 0)
	else
		-- local only: nobody else needs to see it
		previewObject = CreateObjectNoOffset(activeProp.model, coords.x, coords.y, coords.z, false, false, false)
	end

	if previewObject == 0 or not DoesEntityExist(previewObject) then
		previewObject = 0
		return false
	end

	SetEntityCollision(previewObject, false, false)
	FreezeEntityPosition(previewObject, true)
	SetEntityCoordsNoOffset(previewObject, coords.x, coords.y, coords.z, false, false, false)
	applyRotation(coords)
	SetFocusEntity(previewObject)

	if not weaponHash then return true end

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

	return true
end

-- Film the object side-on from its +Y axis as it sat when the inspection opened, then turn the
-- camera so it lands in the middle of the window rather than the middle of the screen.
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

	local fov = cameraFov()

	if windowRect then
		local tanV = math.tan(math.rad(fov / 2))
		local tanH = tanV * GetAspectRatio(false)
		local u = (windowRect.x + windowRect.w / 2 - 0.5) * 2
		local v = (windowRect.y + windowRect.h / 2 - 0.5) * 2

		yaw = yaw + math.deg(math.atan(u * tanH))
		pitch = pitch + math.deg(math.atan(v * tanV))
	end

	SetCamCoord(previewCam, camCoords.x, camCoords.y, camCoords.z)
	SetCamRot(previewCam, pitch, 0.0, yaw, 2)
	SetCamFov(previewCam, fov)

	camState = { coords = camCoords, pitch = pitch, yaw = yaw, distance = #delta, fov = fov }

	-- In focus from the lens to just past the object, so the object and the backdrop behind it
	-- (drawn just past it) stay sharp and only the world shows blurred. SetUseHiDof keeps it on,
	-- every frame, from the draw loop.
	if DOF_STRENGTH > 0 then
		local sharp = #delta + #(max - min) / 2 + 0.2

		SetCamUseShallowDofMode(previewCam, true)
		SetCamDofStrength(previewCam, DOF_STRENGTH)
		SetCamNearDof(previewCam, 0.01)
		SetCamFarDof(previewCam, sharp)
		SetCamDofPlanes(previewCam, 0.0, 0.0, sharp, sharp + DOF_FALLOFF)
	end
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

-- one frame of the backdrop and the key light
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
		local radius = #(max - min) / 2
		local depth = camState.distance + radius + 0.1
		local halfH = depth * math.tan(math.rad(camState.fov / 2))
		local halfW = halfH * GetAspectRatio(false)
		local centre = camState.coords + forward * depth

		-- On a plane square to the camera, screen position is linear in the offset along right and
		-- up. Measuring that line through the game's own projection (as the pins are placed) keeps
		-- the pieces on the screen where they're meant to be; the FOV alone left them a little off.
		local originX, originY, scaleX, scaleY = 0.5, 0.5, 0.5 / halfW, -0.5 / halfH
		local sideX, sideY = centre + right * (halfW * 0.5), centre + up * (halfH * 0.5)
		local okO, ox, oy = GetScreenCoordFromWorldCoord(centre.x, centre.y, centre.z)
		local okX, rx = GetScreenCoordFromWorldCoord(sideX.x, sideX.y, sideX.z)
		local okY, _, uy = GetScreenCoordFromWorldCoord(sideY.x, sideY.y, sideY.z)

		if okO and okX and okY and rx ~= ox and uy ~= oy then
			originX, originY = ox, oy
			scaleX, scaleY = (rx - ox) / (halfW * 0.5), (uy - oy) / (halfH * 0.5)
		end

		-- the point at screen x, y on the plane square to the camera at distance d
		local function at(x, y, d)
			local k = d / depth
			return camState.coords + forward * d + right * ((x - originX) / scaleX * k) + up * ((y - originY) / scaleY * k)
		end

		-- a vertex at screen x, y and distance d, textured by its screen position
		local function vertex(x, y, d)
			return { pos = at(x, y, d), uv = { math.min(math.max(x, 0.0), 1.0), math.min(math.max(y, 0.0), 1.0) } }
		end

		-- a, b, c, d go round the quad; both windings, as a poly only shows from one side (so the
		-- see-through texture is laid once)
		local function quad(a, b, c, d)
			drawTriangle(a.pos, b.pos, c.pos, a.uv, b.uv, c.uv)
			drawTriangle(a.pos, c.pos, d.pos, a.uv, c.uv, d.uv)
			drawTriangle(a.pos, c.pos, b.pos, a.uv, c.uv, b.uv)
			drawTriangle(a.pos, d.pos, c.pos, a.uv, d.uv, c.uv)
		end

		if not windowRect then
			quad(vertex(-0.01, -0.01, depth), vertex(1.01, -0.01, depth), vertex(1.01, 1.01, depth), vertex(-0.01, 1.01, depth))
		else
			-- Only the window, where the weapon is, has to sit behind it; round it the backdrop sits right
			-- by the lens, where ground and walls can't come in front (one plane behind a long rifle reaches
			-- into the ground). Every piece is square to the camera and textured by screen position, so
			-- they read as one. Pieces at two depths can't meet on a shared edge: the world's float
			-- precision puts the near one's edge half a pixel either way. So the near frame stops a couple
			-- of pixels short of the window, and a strip sharing the exact corners of both closes the gap;
			-- triangles on shared vertices meet with no crack and no overlap.
			-- In front of the object too, so a zoomed or turned object that outgrows the window is cut
			-- off at its edge. Closer in, the precision error grows, so the margin grows with it.
			local nearDepth = math.max(math.min(NEAR_DEPTH, (camState.distance - radius) * 0.7), 0.05)
			local margin = 2 * math.max(1, NEAR_DEPTH / nearDepth)

			local x0, y0 = windowRect.x, windowRect.y
			local x1, y1 = x0 + windowRect.w, y0 + windowRect.h
			local ex, ey = margin / backdropSize[1], margin / backdropSize[2]

			local ftl, ftr = vertex(x0, y0, depth), vertex(x1, y0, depth)
			local fbr, fbl = vertex(x1, y1, depth), vertex(x0, y1, depth)
			quad(ftl, ftr, fbr, fbl)

			local xs = { -0.01, x0 - ex, x1 + ex, 1.01 }
			local ys = { -0.01, y0 - ey, y1 + ey, 1.01 }
			local near = {}

			for row = 1, 4 do
				near[row] = {}
				for col = 1, 4 do
					near[row][col] = vertex(xs[col], ys[row], nearDepth)
				end
			end

			for row = 1, 3 do
				for col = 1, 3 do
					if row ~= 2 or col ~= 2 then
						quad(near[row][col], near[row][col + 1], near[row + 1][col + 1], near[row + 1][col])
					end
				end
			end

			local ntl, ntr, nbr, nbl = near[2][2], near[2][3], near[3][3], near[3][2]
			quad(ntl, ntr, ftr, ftl)
			quad(ntr, nbr, fbr, ftr)
			quad(nbr, nbl, fbl, fbr)
			quad(nbl, ntl, ftl, fbl)
		end
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
			-- the camera's shallow depth of field only holds while this is called each frame
			if DOF_STRENGTH > 0 then SetUseHiDof() end
			Wait(0)
		end
	end)
end

---@param weaponHash number? nil films activeProp's model
local function spawnPreview(weaponHash, metadata)
	deletePreview()

	local model

	if weaponHash then
		if not ensureWeaponAsset(weaponHash) then return false end
		model = GetWeapontypeModel(weaponHash)
	else
		model = activeProp.model
		if not IsModelInCdimage(model) or not pcall(lib.requestModel, model, 5000) then return false end
		activeProp.rotation = activeProp.rotation or autoRotation(model)
	end

	-- the camera sits between the player and the object, looking away from the player, so the
	-- object is placed far enough out for that gap
	local ped = cache.ped
	local forward = GetEntityForwardVector(ped)
	local distance = cameraDistance(model)
	local coords = GetEntityCoords(ped) + forward * (distance + 0.9) + vector3(0.0, 0.0, 0.45)

	baseHeading = GetEntityHeading(ped) + 180.0
	rotateHeading = 0.0

	local spawned = spawnObject(weaponHash, metadata, coords)
	if not weaponHash then SetModelAsNoLongerNeeded(model) end
	if not spawned then return false end

	previewCam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
	aimCamera()
	SetCamActive(previewCam, true)
	RenderScriptCams(true, false, 0, true, true)

	return true
end

local function sendPins()
	if not inspecting or previewObject == 0 or not DoesEntityExist(previewObject) then return end
	-- items have no attachment points
	if activeProp then return SendNUIMessage({ action = 'inspectPins', data = {} }) end

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
	if not data?.weapon or previewObject == 0 then return end

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
	local prop = propOf(data)
	if not prop and (not data?.weapon or data.throwable) then return end

	-- holster it, so the weapon in hand never goes out of sync with its attachments
	if not prop and equippedSlot == slot then
		TriggerEvent('ox_inventory:disarm', true)
	end

	local state = buildState(slot)
	if not state then return end

	windowRect = rect
	activeSlot = slot
	activeProp = prop
	zoom = math.min(math.max(prop?.zoom or 1.0, ZOOM_MIN), ZOOM_MAX)
	inspecting = true

	-- the UI hides its own backdrop only when this one is drawn; without it the UI cuts a window
	-- in its own instead, which shows the world behind the weapon
	state.backdrop = ensureBackdrop()
	if not inspecting then return end

	if not spawnPreview(not prop and data.hash or nil, item.metadata or {}) then
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
	activeProp = nil
	propAxes, propPivot, propCentre = nil, nil, nil

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

-- delta turns round the vertical; pitch (props only) tips it toward or away from the camera
RegisterNUICallback('inspectRotate', function(data, cb)
	cb(1)
	if not inspecting or previewObject == 0 then return end

	local delta = tonumber(data?.delta) or 0

	if not propAxes then
		rotateHeading = rotateHeading + delta
		applyRotation()
		return sendPins()
	end

	local pitch = tonumber(data?.pitch) or 0
	local up = vector3(0.0, 0.0, 1.0)
	local right = camState and vector3(math.cos(math.rad(camState.yaw)), math.sin(math.rad(camState.yaw)), 0.0)

	for axis, vector in pairs(propAxes) do
		vector = turnVector(vector, up, math.rad(delta))
		-- turning round the camera's right tips the top toward it as the drag goes down
		if right then vector = turnVector(vector, right, math.rad(pitch)) end
		propAxes[axis] = vector
	end

	-- small turns add up rounding: square the axes back up so the model never skews
	local x = norm(propAxes.x)
	local y = norm(propAxes.y - x * (x.x * propAxes.y.x + x.y * propAxes.y.y + x.z * propAxes.y.z))
	propAxes.x, propAxes.y = x, y
	propAxes.z = vector3(x.y * y.z - x.z * y.y, x.z * y.x - x.x * y.z, x.x * y.y - x.y * y.x)

	placeProp()
end)

-- scroll zoom on a prop: steps > 0 zooms in
RegisterNUICallback('inspectZoom', function(data, cb)
	cb(1)
	if not inspecting or not activeProp then return end

	zoom = math.min(math.max(zoom * ZOOM_STEP ^ (tonumber(data?.steps) or 0), ZOOM_MIN), ZOOM_MAX)
	aimCamera()
end)

RegisterNUICallback('inspectRect', function(rect, cb)
	cb(1)
	if not inspecting or type(rect) ~= 'table' then return end

	windowRect = rect
	aimCamera()
	sendPinsSoon(50)
end)

RegisterNUICallback('inspectApply', function(data, cb)
	if not inspecting or not activeSlot or activeProp or type(data?.slot) ~= 'number' then return cb(false) end

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
	if not inspecting or not activeSlot or activeProp or type(data?.component) ~= 'string' then return cb(false) end

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
