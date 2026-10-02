# Palette provenance

Every value in `client.js` comes from
[Everforest](https://github.com/sainnhe/everforest) by sainnhe, MIT licensed.

| Source | Used for |
| --- | --- |
| [`autoload/everforest.vim`](https://github.com/sainnhe/everforest/blob/master/autoload/everforest.vim) → `everforest#get_palette(background, colors_override)` | the six planes (accent + background tables below) |
| [`colors/everforest.vim`](https://github.com/sainnhe/everforest/blob/master/colors/everforest.vim) | the syntax mapping in `docs/MAPPING.md` (`Comment`, `String`, `Function`, `Keyword`, `Constant`, `Number`, `Type`, `Special`, `Operator`, `Identifier`, `Label`, `Title`) |

Upstream exposes the background as `hard` / `medium` / `soft` crossed with
Vim's `&background` (`dark` / `light`), which is exactly the six palettes this
pack ships.

## Accent planes

Shared by the three depths within one scheme.

| slot | dark | light |
| --- | --- | --- |
| fg | `#d3c6aa` | `#5c6a72` |
| red | `#e67e80` | `#f85552` |
| orange | `#e69875` | `#f57d26` |
| yellow | `#dbbc7f` | `#dfa000` |
| green | `#a7c080` | `#8da101` |
| aqua | `#83c092` | `#35a77c` |
| blue | `#7fbbb3` | `#3a94c5` |
| purple | `#d699b6` | `#df69ba` |
| grey0 | `#7a8478` | `#a6b0a0` |
| grey1 | `#859289` | `#939f91` |
| grey2 | `#9da9a0` | `#829181` |
| statusline1 | `#a7c080` | `#93b259` |
| statusline2 | `#d3c6aa` | `#708089` |
| statusline3 | `#e67e80` | `#e66868` |

## Background planes

Column order: `bg_dim, bg0, bg1, bg2, bg3, bg4, bg5` then
`bg_visual, bg_red, bg_yellow, bg_green, bg_blue, bg_purple`.

| plane | bg_dim … bg5 | visual … purple |
| --- | --- | --- |
| dark-hard | `#1e2326` `#272e33` `#2e383c` `#374145` `#414b50` `#495156` `#4f5b58` | `#4c3743` `#493b40` `#45443c` `#3c4841` `#384b55` `#463f48` |
| dark-medium | `#232a2e` `#2d353b` `#343f44` `#3d484d` `#475258` `#4f585e` `#56635f` | `#543a48` `#514045` `#4d4c43` `#425047` `#3a515d` `#4a444e` |
| dark-soft | `#293136` `#333c43` `#3a464c` `#434f55` `#4d5960` `#555f66` `#5d6b66` | `#5c3f4f` `#59464c` `#55544a` `#48584e` `#3f5865` `#4e4953` |
| light-hard | `#f2efdf` `#fffbef` `#f8f5e4` `#f2efdf` `#edeada` `#e8e5d5` `#bec5b2` | `#f0f2d4` `#ffe7de` `#fef2d5` `#f3f5d9` `#ecf5ed` `#fceced` |
| light-medium | `#efebd4` `#fdf6e3` `#f4f0d9` `#efebd4` `#e6e2cc` `#e0dcc7` `#bdc3af` | `#eaedc8` `#fde3da` `#faedcd` `#f0f1d2` `#e9f0e9` `#fae8e2` |
| light-soft | `#e5dfc5` `#f3ead3` `#eae4ca` `#e5dfc5` `#ddd8be` `#d8d3ba` `#b9c0ab` | `#e1e4bd` `#fadbd0` `#f1e4c5` `#e5e6c5` `#e1e7dd` `#f1ddd4` |

In both schemes a higher `bg` index is further from the base surface (lighter
in the dark planes, darker in the light planes), so the mapping table in
`MAPPING.md` uses slot names only and serves all six palettes.

## Upstream license

```
Copyright (c) 2019 sainnhe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

The full text is reproduced in `LICENSE`.
