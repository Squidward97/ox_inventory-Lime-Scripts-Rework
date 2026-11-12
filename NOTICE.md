Copyright © 2021-2026 [Linden](https://github.com/thelindat), [Luke](https://github.com/LukeWasTakenn), [Dunak](https://github.com/dunak-debug) and contributors

The original source code is available at: https://github.com/overextended/ox_inventory

---

This project is licensed under the [GPL‑3.0](https://www.gnu.org/licenses/gpl-3.0.en.html) or later. A complete copy of the license is included in the [LICENSE](./LICENSE) file.

When incorporating this work into your own project, you must:

- Clearly credit the original authors and provide a link to the original project.
- Preserve all copyright, license, and attribution notices, including this NOTICE file.
- Document any modifications made to the original work.
- Include the full text of the GPL‑3.0 license with your distribution.
- License modified versions of this project under the GPL‑3.0 or later.

If this project has been useful to you, please [consider sponsoring its continued development](https://ko-fi.com/thelindat).

---

## Modifications

This is a modified version of ox_inventory 2.47.9, distributed at https://github.com/Squidward97/ox_inventory-Lime-Scripts-Rework under the same GPL‑3.0-or-later license. The changes from the original are:

- Utility and equipment slots, a backpack system with stash-backed bags, worn clothing for gear, and armour plates (`modules/utility/*`, plus changes to the inventory, items, shops and server modules)
- 3D inspection of weapons and items (`modules/weapon/inspect.lua`)
- A shop cart with card payments and bank functions in the ESX, QBX and ND bridges
- A redesigned web UI: five themes, card-based crafting and shops, item search, filters and favourites, a new context menu, motion and synthesized sounds (`web/src`)

Every change to a stock function is listed in [README-backpack-utility.md](./README-backpack-utility.md).

### DPS Inventory

This copy is a further modified version, distributed at https://github.com/DaemonAlex/dps-inventory under the same GPL-3.0-or-later license. It starts from the Lime Scripts rework above (as of 30 October 2026) and changes the following:

- A sixth web UI theme, `delperro` (`web/src/styles/delperro.scss`), registered in `web/src/main.tsx`, `web/src/utils/uistyle.ts`, `web/src/components/inventory/InventoryChrome.tsx`, `client.lua` and `locales/en.json`, and made the default in `init.lua`. Modified by DelPerroSands, November 2026.
- The changes of ox_inventory 2.48.0 and 2.48.1 applied on top of the rework's 2.47.9 base (12 files, unchanged from upstream). Copyright of those changes remains with the ox_inventory authors.
- A self status panel: `modules/status/client.lua` and `web/src/components/inventory/PlayerStatus.tsx` (new), with changes to `client.lua`, `web/src/components/inventory/PlayerUtility.tsx`, `web/src/components/utils/BodySvg.tsx`, `web/src/index.scss` and `web/src/styles/outline.scss`. Modified by DelPerroSands, November 2026.
- `modules/items/server.lua`: a bag that was a stock container keeps its contents when its item becomes a backpack. Modified by DelPerroSands, November 2026.
- `tools/categorise.py` and `tools/shrink_images.py` (new).
- `fxmanifest.lua`: version, repository link and description.
- Documentation: `README.md` rewritten, `UPDATING.md` added, this section added.

Credit for the inventory belongs to the ox_inventory authors named at the top of this file. Credit for the equipment slots, backpacks, armour plates, 3D inspection, shop cart and redesigned interface belongs to Lime Scripts (Squidward97) and contributors.

---

## Frequently asked questions

### Can I redistribute modified versions of this project?
You may fork, modify, and redistribute this project, provided you comply with the license and preserve the same rights and freedoms for downstream recipients.

### Am I allowed to encrypt this project?
Recipients of this project must receive the complete corresponding source code and be able to install, motifiy, build, and run it. Distributing the project in a form — including through encryption, obfuscation, or other technical measures — that prevents recipients from exercising the rights granted by the license is not permitted.

### Can I sell a modified version of this project?
Commercial distribution is permitted, provided you comply with the terms of the license. However, recipients retain the same rights and freedoms under the license and may freely redistribute modified versions.
