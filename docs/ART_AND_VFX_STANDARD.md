# Art, animation and VFX quality standard

## Visual direction

Hard science-fiction environments with cinematic scale, luminous accents and strong material identity. The world should feel physically coherent first, fantastical second. Use atmospheric depth, large readable silhouettes, carefully layered materials and lighting that supports navigation.

## Quality requirements

### Characters and creatures
- Production-ready topology and deformation-friendly edge flow.
- Consistent scale, silhouette and material response.
- Separate facial/body rigs where required, layered locomotion and contextual animation.
- Animation transitions must preserve foot/hand contact, momentum and anticipation.
- Powers need authored start-up, active, impact and recovery states.

### Planets and environments
- Distinct shape language visible from orbit.
- Layered terrain materials, macro-to-micro detail and believable erosion/biome transitions.
- Atmosphere, clouds, horizon scattering and day/night lighting tuned per world.
- Scatter systems and procedural placement must preserve authored landmarks.
- Ruins should communicate age, function and cultural identity.

### Combat and boss effects
Every major attack should have:
1. Anticipation and tell.
2. Travel/charge behavior.
3. Contact, hit-stop or environmental response.
4. Secondary particles/debris/light response.
5. Dissipation and recovery.
6. Audio cue with a distinct mix priority.

Boss attacks must remain readable at normal gameplay camera distance. Avoid excessive bloom that hides attack boundaries.

## Unreal implementation direction

- Nanite for suitable high-detail static geometry.
- Lumen with scalable quality tiers and controlled emissive contribution.
- Niagara for abilities, weather, trails and event effects; GPU simulation only where justified.
- Chaos for authored destruction and physics interaction.
- Animation Blueprints, Control Rig, Motion Warping and layered montages where they fit the character.
- Material Parameter Collections for global event/weather state.

## Performance and accessibility

Initial targets are hypotheses, not verified results. Profile on named min/target/high hardware tiers before sign-off. Build effect pooling, LOD, distance culling and scalability from the start. Offer reduced camera shake, reduced flash, lowered particle density and telegraphs that do not rely on color alone.

## Asset status

The supplied visual reference bundle currently contains text labels for concept subjects, but no usable PNG/JPG/WebP files or production 3D assets. All final models, textures, rigs, animations, cinematics, audio and polished VFX remain to be created or licensed.
