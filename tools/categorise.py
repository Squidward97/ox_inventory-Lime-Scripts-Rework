# Sorts ox_inventory items into the screen's filter categories and rarity tiers by name and use.
# Usage: python3 categorise.py data/items.lua   (adds `category`/`rarity` only where none is set)
import re,collections,sys
p=sys.argv[1]; L=open(p,encoding='utf-8').read().split('\n')
op=re.compile(r"^(\s*)\['([A-Za-z0-9_\-]+)'\]\s*=\s*\{(.*)$")
def has(n,words):
    toks=re.split(r'[_\-]',n)
    for w in words:
        if len(w)>=5 or '_' in w:
            if w in n: return True
        elif any(t==w or (len(t)>len(w) and t.endswith(w)) for t in toks): return True
    return False
FOOD=['burger','pizza','coffee','juice','beer','wine','vodka','whiskey','sandwich','cake','tea','cola','soda','water','donut','cookie','ramen','noodle','taco','fries','candy','milk','bread','cheese','drink','cocktail','latte','mocha','sake','sushi','bento','riceball','pancake','mochi','hotdog','chocolate','sprunk','tosti','absinthe','tequila','champagne','smoothie','salad','soup','steak','bacon','icecream','muffin','bagel','burrito','nugget','brownie','croissant','waffle','popcorn','lemonade','milkshake','miso','purrito','baileys','pie']
WEAP=['_ammo','ammo_','clip','suppressor','scope','weapontint','_attachment','magazine','muzzle','_grip','pistol_flashlight','rifle_flashlight','shotgun_flashlight','sniper_flashlight','_barrel','smg_drum','rifle_drum','shotgun_drum']
CLOTH=['armor','armour','vest','backpack','duffel','briefcase','paramedicbag','mask','hat','glasses','necklace','earring','ring','watch','rolex','chain','clothing','outfit','parachute','diving_gear','harness','gloves','shoes','helmet','jacket','bracelet','holster']
TOOL=['lockpick','kit','drill','screwdriver','wrench','phone','radio','laptop','tablet','binocular','pickaxe','goldpan','rod','hammer','saw','torch','jerry_can','scanner','usb','thermite','handcuff','lighter','camera','gps','tool','jammer','crowbar','shovel','axe','stormram','pinger','gatecrack','cryptostick','walking_stick','walkstick','stretcher','wheelchair','crutch','defib','thermometer','pulseox','penlight','stethoscope','flashlight','ziptie','spikestrip','breathalyzer','mininglaser','ladder','trowel','scissors','nitrous','keys']
LEG=['goldbar','legendary']
EPIC=['thermite','trojan_usb','security_card','coke_brick','weed_brick','heavyarmor','uncut_diamond','diamond_necklace','mininglaser','goldingot','gatecrack']
RARE=['diamond','emerald','sapphire','rolex','advancedlockpick','cryptostick','markedbills','coke','meth','crack','goldchain','gold_ring','electronickit','advancedrepairkit','stormram','nitrous','drill','ruby','xtc']
UNC=['_seed','ore','silver','lockpick','armor','armour','repairkit','weed_','joint','suppressor','scope','extendedclip','ingot','jammer','radio','binocular','oxy','drum']
cat=collections.Counter(); rar=collections.Counter(); out=[]; i=0
while i<len(L):
    m=op.match(L[i])
    if not m: out.append(L[i]); i+=1; continue
    ind,name,rest=m.groups(); n=name.lower()
    depth=0; j=i
    while True:
        depth+=L[j].count('{')-L[j].count('}')
        if depth<=0 or j-i>80: break
        j+=1
    blk='\n'.join(L[i:j+1]); c=None; engine=n.endswith('eng') or 'workbench' in n
    if 'category =' not in blk and not engine and not n.startswith(('weapon_','at_','ammo')):
        if has(n,WEAP): c='weapons'
        elif re.search(r'\b(hunger|thirst)\b',blk) or "anim = 'eating'" in blk or 'loop_bottle' in blk: c='food'
        elif has(n,CLOTH): c='clothing'
        elif has(n,TOOL): c='tools'
        elif has(n,FOOD) and not has(n,['_seed','packaged','_box','_bulk','keg','gold','stand','machine']): c='food'
    r=None
    if 'rarity =' not in blk and not engine:
        if has(n,LEG): r='legendary'
        elif has(n,EPIC): r='epic'
        elif c!='food' and has(n,RARE): r='rare'
        elif c!='food' and has(n,UNC): r='uncommon'
    add=[]
    if c: add.append("category = '%s'"%c); cat[c]+=1
    if r: add.append("rarity = '%s'"%r); rar[r]+=1
    if not add: out.append(L[i])
    elif rest.strip()=='':
        ni=re.match(r'\s*',L[i+1]).group(0) or ind+'\t'
        out.append(L[i]); out+=[ni+a+',' for a in add]
    else: out.append("%s['%s'] = { %s, %s"%(ind,name,', '.join(add),rest.lstrip()))
    i+=1
open(p,'w',encoding='utf-8').write('\n'.join(out))
print(dict(cat),sum(cat.values())); print(dict(rar),sum(rar.values()))
