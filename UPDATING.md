# Updating DPS Inventory

This project sits on two others. Each can move on without the other:

| Upstream | What it is | How its changes come in |
|---|---|---|
| [overextended/ox_inventory](https://github.com/overextended/ox_inventory) | The inventory | As a patch between two release tags (Part 1) |
| [Squidward97/ox_inventory-Lime-Scripts-Rework](https://github.com/Squidward97/ox_inventory-Lime-Scripts-Rework) | The rework | As a normal merge (Part 2) |

**Now based on:** ox_inventory **2.48.1**. Lime Scripts rework as of **30 October 2026**.
Change this line every time you update, so the next person knows where to start from.

Why two methods: the rework's repository was not made as a GitHub fork of ox_inventory, so the two
share no history and `git merge` between them does not work. A patch between two ox_inventory tags
does. The rework itself is a true ancestor of this project, so it merges normally.

## Before you start

- Work on a branch, never straight on the branch the server runs.
- Keep a copy of the folder the server is running. If anything goes wrong, put it back.
- The server's own data (`data/items.lua` and the rest) is not part of an update. Do not let an
  update overwrite it.

One-time setup of the two upstreams:

```sh
git remote add ox https://github.com/overextended/ox_inventory.git
git remote add lime https://github.com/Squidward97/ox_inventory-Lime-Scripts-Rework.git
```

## Part 1: take a new ox_inventory release

Example: this project is on 2.48.1 and ox_inventory has released 2.49.0.

1. Get the new tags and read what changed.

   ```sh
   git fetch ox --tags
   git log --oneline v2.48.1..v2.49.0
   git diff --stat v2.48.1 v2.49.0
   ```

2. Make the patch between the version you are on and the new one, and apply it.

   ```sh
   git checkout -b update-ox-2.49.0
   git diff v2.48.1 v2.49.0 > /tmp/ox-update.patch
   git apply --3way --exclude='.github/*' /tmp/ox-update.patch
   ```

   `--3way` applies what it can and leaves conflict markers where both sides changed the same
   lines. `--exclude` skips upstream's GitHub housekeeping files, which this project does not have.

3. Fix the conflicts. `git status` lists them as "both modified".

   - **`fxmanifest.lua`** conflicts every time, on the version line. Keep the new version number,
     keep this project's `repository` and `description` lines.
   - **A stock function the rework changed.** Section 5 of
     [README-backpack-utility.md](./README-backpack-utility.md) lists every one, with the exact
     change. Keep upstream's new code and put the rework's change back into it.
   - **`web/src`.** The rework redesigned the screen, so upstream changes here rarely apply as
     written. Read what upstream changed and why. A bug fix in logic (a thunk, a reducer, a
     helper) is carried over by hand. A change to upstream's own layout or styles is usually
     not needed, because that layout is not used here.
   - **`data/`.** If upstream changed an example data file, do not copy it over the server's
     file. Read the change and apply the part you want by hand.

   When 2.48.0 and 2.48.1 were applied this way, 11 of 12 files applied cleanly and only
   `fxmanifest.lua` needed a hand.

4. Check nothing is left over, then build.

   ```sh
   grep -rn '<<<<<<<\|>>>>>>>' --include=*.lua --include=*.ts --include=*.tsx --include=*.json . | grep -v node_modules
   cd web && npm install --legacy-peer-deps && npm run build
   ```

   The first command must print nothing.

5. Update the "Now based on" line at the top of this file, and the version in `README.md` and
   `NOTICE.md`.

6. Test on the server (see "What to test"), then merge the branch.

## Part 2: take new work from the Lime Scripts rework

```sh
git fetch lime
git log --oneline HEAD..lime/main        # what is new
git checkout -b update-lime
git merge lime/main
```

Conflicts are most likely in the files listed under "What DelPerroSands changed" in
[README.md](./README.md), because those are the only ones this project edits:

- `web/src/utils/uistyle.ts`, `web/src/main.tsx`, `InventoryChrome.tsx`, `client.lua`: each has
  a list of themes. Keep the rework's new list and add `delperro` back to it.
- `init.lua`: keep `delperro` as the default theme.
- `client.lua`: also keep the `Status` require and the `Status.open()` and `Status.close()` calls.
- `PlayerUtility.tsx`: keep the `player-utility-centre` wrapper and `<PlayerStatus />` under the figure.
- `BodySvg.tsx`: keep the `updateStatus` branch and the `label` in the tooltip.
- `modules/items/server.lua`: keep the `metadata.container` branch in `setBackpackMetadata`.
- `locales/en.json`: keep both sets of strings.
- `fxmanifest.lua`, `README.md`, `NOTICE.md`: keep this project's versions. Read the rework's new
  README for anything worth copying across.

Then check the theme still covers the screen. `web/src/styles/delperro.scss` started as a copy of
`midnight.scss`. If the rework added new parts to its themes, compare:

```sh
git diff HEAD~1 -- web/src/styles/midnight.scss
```

Anything new there probably needs its DelPerroSands version in `delperro.scss`. Build and look at
it with `npm start`, opening the page with `?uistyle=delperro`.

If the rework has moved to a newer ox_inventory than this project, do Part 2 first. Part 1 may
then have nothing left to do.

## What to test

A build that succeeds proves the screen compiles. It does not prove the inventory works. On the
server, with a copy of the old folder ready to put back:

1. The inventory opens and closes. Items show with their pictures.
2. Move, split, stack, use, give and drop an item.
3. A shop: buy with cash, and with the cart by card.
4. A stash, a vehicle trunk and a glovebox open and hold items.
5. A weapon: equip, fire, reload, holster. Inspect it.
6. A backpack: wear it, fill it, take it off, drop it, pick it up. Contents are still there.
7. A vest with plates: insert, take damage, relog. The plates are still there.
8. Keys 1 to 5 use the quick slots.
   The status panel shows your meters, and an injury lights up the right limb.
9. Every script that hooks the inventory still does its job. Search your resources for
   `registerHook` to list them.
10. The server console shows no errors from `ox_inventory` at start, and none while doing the above.

## If it goes wrong

Stop the server, put the old `ox_inventory` folder back, start the server. Player inventories are
stored in the database, not in this folder, so swapping the folder back does not lose items. The one exception is anything created only by a feature the old version lacks: a
backpack's own contents and a vest's plates exist only while the rework is running.
