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

This is a modified version of ox_inventory 2.47.9, distributed at https://github.com/ValvisMarios/ox_inventory-Lime-Scripts-Rework under the same GPL‑3.0-or-later license. The changes from the original are:

- Utility and equipment slots, a backpack system with stash-backed bags, worn clothing for gear, and armour plates (`modules/utility/*`, plus changes to the inventory, items, shops and server modules)
- 3D inspection of weapons and items (`modules/weapon/inspect.lua`)
- A shop cart with card payments and bank functions in the ESX, QBX and ND bridges
- A redesigned web UI: five themes, card-based crafting and shops, item search, filters and favourites, a new context menu, motion and synthesized sounds (`web/src`)

Every change to a stock function is listed in [README-backpack-utility.md](./README-backpack-utility.md).

---

## Frequently asked questions

### Can I redistribute modified versions of this project?
You may fork, modify, and redistribute this project, provided you comply with the license and preserve the same rights and freedoms for downstream recipients.

### Am I allowed to encrypt this project?
Recipients of this project must receive the complete corresponding source code and be able to install, motifiy, build, and run it. Distributing the project in a form — including through encryption, obfuscation, or other technical measures — that prevents recipients from exercising the rights granted by the license is not permitted.

### Can I sell a modified version of this project?
Commercial distribution is permitted, provided you comply with the terms of the license. However, recipients retain the same rights and freedoms under the license and may freely redistribute modified versions.
