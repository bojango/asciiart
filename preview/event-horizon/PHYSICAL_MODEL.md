# EVENT HORIZON — physical system v1 (experimental, invisible)

**Status:** Physics-only model committed on \`feature/event-horizon-rebuild\`. It is **not loaded by any preview, production renderer, or wall-art application**. Approved artwork is untouched.

## Locked first-pass configuration

| Parameter | Value |
|---|---|
| Black hole mass | 5 solar masses |
| Gas-donor companion | 0.4-solar-mass red dwarf |
| Companion radius | 0.416 solar radii (model assumption) |
| Binary separation | 0.010 AU |
| Mutual orbital period | 3.7723 hours |
| Roche-lobe radius around donor | 0.0019369 AU ≈ 0.4165 solar radii |
| Donor's Roche-lobe filling fraction | 0.9988 |
| Nominal transfer rate | 10^-9 solar masses per Julian year (assumption) |
| Nominal radiative efficiency | 10% (assumption) |
| Nominal radiation luminosity | ~5.66 × 10^29 W (~0.9% of Eddington) |
| Companion visibility | Hidden, reserved for a later art pass |

**Roche-lobe overflow** is the specified fuel mechanism: the donor nearly fills its Roche lobe. These values make mass transfer physically plausible, but do **not** demonstrate that the disc must remain persistently luminous over millions of years. That requires disc-temperature/irradiation and stellar mass-transfer modelling.

The binary is treated as two point masses on a fixed circular orbit around their barycentre. \`binaryAt(tSeconds)\` returns deterministic 3D positions (AU) and velocities (m/s). The apparent orbital-plane tilt is 12° in the initial coordinate convention; this is a physical-orbit coordinate setting, not a visible star. Gas stream trajectory, disc reservoir, magnetohydrodynamics and binary evolution are not yet simulated.

## The eight accepted planets

The eight proposed semimajor axes remain 0.30, 0.42, 0.55, 0.75, 1.00, 1.30, 1.75 and 2.40 AU. They are planned *circumbinary* planets orbiting the combined 5.4-solar-mass barycentre. Their idealised Kepler periods are now approximately:

| Planet | Nominal orbital period |
|---|---:|
| CINDER | 25.8 days |
| SILEX | 42.8 days |
| VERDANT | 64.1 days |
| RUST | 102.1 days |
| ATLAS | 157.2 days |
| HALO | 233.0 days |
| AZURE | 363.9 days |
| UMBRA | 584.4 days |

These are accurate for a central point mass, not yet integrated trajectories that include binary quadrupole perturbations or mutual planet gravity. Their individual eccentricity, inclination, mass and epoch remain to be chosen. Dynamical stability has not been verified.

At a future wall-art speed of 5×, VERDANT's 64.1-day ideal orbit would take ~12.8 days of real time; *visually noteworthy closest approaches depend on observing geometry and cannot be guaranteed from period alone*. A permanent simulation clock and event predictor are future work.

## Engineering boundaries and next phase

1. Keep the existing \`depth.html\` scene, source compositor, and all art modules unchanged while the physical system is being defined.
2. Validate the disc's sustained transfer rate, persistence and radiation budget; add physically motivated fluctuations without random forced refill events.
3. Define planet masses, orbital elements, initial phases, circumbinary stability and the camera's physical position. Add a reproducible timestamp-based integrator and automated invariant checks.
4. Establish a persistent real-time-to-simulation-time mapping with WALL / REAL / FAST / TEST controls, saved epoch and jump-to-event.
5. Only after validation, connect the physics ephemerides to the depth preview. Do not create any visual donor star or gas stream until explicitly requested.

## Scientific basis

- NASA Imagine the Universe: Roche-lobe overflow in low-mass X-ray binaries — https://imagine.gsfc.nasa.gov/science/objects/mass_exchange.html
- Eggleton Roche-lobe relation (1983), discussed in peer-reviewed astronomy literature — https://doi.org/10.1093/mnras/stt2480
- On persistent and transient low-mass accretion discs — https://academic.oup.com/mnras/article/483/4/5595/5256661

Source: \`preview/event-horizon/physical-system.js\`.
Tests: \`tests/event-horizon-physical-system.test.cjs\`.
