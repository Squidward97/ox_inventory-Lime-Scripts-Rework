<div align="center">

# Ox Inventory Rework by Lime Scripts

A fork of [ox_inventory](https://github.com/overextended/ox_inventory) with equipment slots, backpacks, armour plates, 3D item inspection, a shop cart with card payments and five interface themes. It is free and fully open source under GPL-3.0.

[![](https://img.shields.io/github/v/release/Squidward97/ox_inventory-Lime-Scripts-Rework?style=for-the-badge&logo=github)](https://github.com/Squidward97/ox_inventory-Lime-Scripts-Rework/releases/latest/)

See [pitch.md](./pitch.md) for what this fork adds and [README-backpack-utility.md](./README-backpack-utility.md) for configuration and the full list of changes.\
Refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines and to see our Contributor License Agreement.\
Refer to [NOTICE.md](./NOTICE.md) for additional information and legal notices.


**Preview:** https://www.youtube.com/watch?v=MO2mnLA7IQM

</div>

## 📚 Documentation

- This fork: [README-backpack-utility.md](./README-backpack-utility.md)
- Everything else (exports, hooks, items, shops, stashes): https://overextended.dev/docs/ox_inventory

## 💾 Download

https://github.com/Squidward97/ox_inventory-Lime-Scripts-Rework/releases/latest/download/ox_inventory.zip

Keep the resource folder named `ox_inventory`, since other resources depend on that name.

## Supported frameworks

We do not guarantee compatibility or support for third-party resources.

- [ox_core](https://github.com/overextended/ox_core)
- [esx](https://github.com/esx-framework/esx_core)
- [qbox](https://github.com/Qbox-project/qbx_core)
- [nd_core](https://github.com/ND-Framework/ND_Core)

## ✨ Features

- Server-side security ensures interactions with items, shops, and stashes are all validated.
- Logging for important events, such as purchases, item movement, and item creation or removal.
- Supports player-owned vehicles, licenses, and group systems implemented by frameworks.
- Fully synchronised, allowing multiple players to [access the same inventory](https://user-images.githubusercontent.com/65407488/230926091-c0033732-d293-48c9-9d62-6f6ae0a8a488.mp4).

### Items

- Inventory items are stored per-slot, with customisable metadata to support item uniqueness.
- Overrides default weapon-system with weapons as items.
- Weapon attachments and ammo system, including special ammo types.
- Durability, allowing items to be depleted or removed overtime.
- Internal item system provides secure and easy handling for item use effects.
- Compatibility with 3rd party framework item registration.

### Shops

- Restricted access based on groups and licenses.
- Support different currency for items (black money, poker chips, etc).

### Stashes

- Personal stashes, linking a stash with a specific identifier or creating per-player instances.
- Restricted access based on groups.
- Registration of new stashes from any resource.
- Containers allow access to stashes when using an item, like a paperbag or backpack.
- Access gloveboxes and trunks for any vehicle.
- Random item generation inside dumpsters and unowned vehicles.
