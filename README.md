# DPS Inventory

The inventory used on the DelPerroSands FiveM server.

It is [ox_inventory](https://github.com/overextended/ox_inventory) by Overextended, with the
[Lime Scripts rework](https://github.com/Squidward97/ox_inventory-Lime-Scripts-Rework) on top
(equipment slots, backpacks, armour plates, 3D item inspection, a shop cart and a redesigned
screen), plus a sixth theme in the DelPerroSands colours.

**Based on:** ox_inventory 2.48.1 and the Lime Scripts rework as of 30 October 2026.

> The resource folder must be named `ox_inventory`. Other resources call it by that name
> (`exports.ox_inventory`, its events, its image path). `DPS Inventory` is the name of this
> project, not of the folder.

## Credits

This project exists because of other people's work. All of it is theirs unless listed under
"What DelPerroSands changed" below.

| Work | Authors | Licence |
|---|---|---|
| [ox_inventory](https://github.com/overextended/ox_inventory): the inventory itself, its item, weapon, shop, stash and vehicle systems, its security model and its web screen | [Linden](https://github.com/thelindat), [Luke](https://github.com/LukeWasTakenn), [Dunak](https://github.com/dunak-debug) and the Overextended contributors | GPL-3.0-or-later |
| [Ox Inventory Rework](https://github.com/Squidward97/ox_inventory-Lime-Scripts-Rework): equipment and utility slots, backpacks, armour plates, 3D inspection, the shop cart with card payments, the redesigned screen and its five themes | Lime Scripts ([Squidward97](https://github.com/Squidward97)) and contributors | GPL-3.0-or-later |
| DelPerroSands theme, the merge up to ox_inventory 2.48.1, and this documentation | [DelPerroSands](https://github.com/DaemonAlex) | GPL-3.0-or-later |

If this is useful to you, the people to thank are the ox_inventory authors
([sponsor Linden](https://ko-fi.com/thelindat)) and Lime Scripts.

The full legal notices are in [NOTICE.md](./NOTICE.md). The licence text is in [LICENSE](./LICENSE).

## What you get

From ox_inventory:

- Slot-based inventory with per-item metadata, weapons as items, attachments and ammo.
- Shops, stashes, vehicle trunks and gloveboxes, drops, crafting, evidence lockers.
- Everything validated on the server, with logging and hooks other scripts can use.

From the Lime Scripts rework:

- **Equipment slots**: a middle panel round a body figure for a backpack, phone, radio, armour
  and free utility slots, plus a quick-slot row on keys 1 to 5.
- **Backpacks**: a worn bag has its own panel, shows on the character and keeps its own contents.
- **Armour plates**: wear a vest, insert plates, plates wear down as you take damage.
- **3D inspection**: look a weapon or any item over in 3D and fit attachments from there.
- **Shop cart**: add to a cart and pay once, by cash or bank card.
- **A redesigned screen**: search, filters, favourites, rarity colours, a new context menu,
  sounds made in the browser, and themes players can switch between.

From DelPerroSands:

- **The `delperro` theme**: navy panels, one orange outline, cream text, square corners, no glow.
  It is the default theme here.
- ox_inventory 2.48.0 and 2.48.1 applied on top of the rework, which was built on 2.47.9. That
  brings in the upstream fixes of those releases, including the checks that reject a
  client-supplied vehicle inventory id.

## What DelPerroSands changed

Kept short on purpose, so updates stay easy. Every change is one of these:

| File | Change |
|---|---|
| `web/src/styles/delperro.scss` | New. The DelPerroSands theme. |
| `web/src/main.tsx` | Imports the theme. |
| `web/src/utils/uistyle.ts` | Adds `delperro` to the theme list. |
| `web/src/components/inventory/InventoryChrome.tsx` | Adds the theme to the settings menu. |
| `client.lua` | Adds `delperro` to the themes a player may save. |
| `init.lua` | The default theme is `delperro`. |
| `locales/en.json` | Two strings for the theme's name and hint. |
| `fxmanifest.lua` | Version, repository link and description. |
| 12 files from ox_inventory 2.48.0 and 2.48.1 | Applied unchanged. See [UPDATING.md](./UPDATING.md). |
| `README.md`, `NOTICE.md`, `UPDATING.md` | Documentation. |

## Requirements

- FXServer artifact 6116 or newer, OneSync on.
- [oxmysql](https://github.com/overextended/oxmysql) and [ox_lib](https://github.com/overextended/ox_lib).
- A supported framework: ox_core, ESX, Qbox (`qbx_core`) or ND Core.
- To build the screen: Node.js 20.19 or newer with npm, or Bun.

## Install

1. Put this repository in your resources folder, in a folder named `ox_inventory`.
2. Build the screen. The built files are not kept in the repository.

   ```sh
   cd web
   npm install --legacy-peer-deps   # or: bun install
   npm run build                    # or: bun run build
   ```

   `--legacy-peer-deps` is needed with npm because one dependency has not yet declared
   support for React 19. Bun does not need it.
3. Carry your own server data into `data/`: `items.lua`, `weapons.lua`, `shops.lua`,
   `stashes.lua`, `vehicles.lua`, `crafting.lua`. The files in this repository are the
   upstream examples.
4. Add the convars you want to your `ox.cfg`. See below.
5. Start it after your framework, `oxmysql` and `ox_lib`:

   ```cfg
   ensure ox_inventory
   ```

## Settings

Everything is set with convars. The ones that come from ox_inventory are documented at
<https://overextended.dev/docs/ox_inventory>. The ones added by the rework are documented in
[README-backpack-utility.md](./README-backpack-utility.md). The most used:

```cfg
# Theme: delperro (default here), tactical, glass, minimal, midnight, outline.
# This is only the default. Each player can pick their own from the gear button.
setr inventory:uistyle "delperro"

# Screen sounds, 0 to 1. 0 turns them off.
setr inventory:uisound 0.5

# Equipment slots. Set to [] to turn the whole feature off.
# setr inventory:utilityslots [ ... ]   (full example in README-backpack-utility.md)

# Backpack weight: share of the contents' weight that counts while worn, and while stored.
setr inventory:backpackcarryweight 60
setr inventory:backpackstorageweight 30

# Armour plates. Set to {} to turn them off.
setr inventory:armourplates { "item": "armour_plate", "armourPerPlate": 50, "maxPlates": 2, "actionTime": 1500 }

# Shop cart: allow paying by bank card, and an optional item needed to do so.
setr inventory:cardpayment true
setr inventory:carditem ""
```

## The DelPerroSands theme

The colours are at the top of `web/src/styles/delperro.scss`:

| Colour | Value | Used for |
|---|---|---|
| Navy | `#0e1a2b`, `#152539`, `#1b2e45` | Panels, slots, filled slots |
| Line | `#2b4057` | Slot and control borders |
| Cream | `#f2ead9` | Text |
| Orange | `#ff7a45` | The panel outline, the hovered slot, the active control, the main button |

To change the look, edit that file and build again. To preview a theme in a browser without the
game, run `npm start` in `web/` and open the page with `?uistyle=delperro`.

## Updating

There are two things to keep up with: ox_inventory itself, and the Lime Scripts rework.
[UPDATING.md](./UPDATING.md) has the steps for both, written from doing it for 2.48.1.

## Documentation

- This project's changes: this file and [UPDATING.md](./UPDATING.md).
- The rework's features, settings and every changed stock function:
  [README-backpack-utility.md](./README-backpack-utility.md).
- Everything else (exports, hooks, items, shops, stashes): <https://overextended.dev/docs/ox_inventory>.

## Support

This is one server's inventory, shared in the open because the licence asks for that and because
it may save someone else the work. It comes with no support. For help with ox_inventory itself,
use the Overextended documentation. Please do not ask the ox_inventory or Lime Scripts authors
about changes made here.

## Licence

GPL-3.0-or-later, the same as ox_inventory and the rework. You may use, change and share it. If
you share a changed version, it must stay under the same licence, keep these credits, and come
with its source. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md).
