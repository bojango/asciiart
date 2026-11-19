/* EVENT HORIZON — physical system, stage 1: hidden mass-transferring binary.
 * Independent physics data; deliberately NOT imported by any renderer.
 *
 * Units are explicit and SI is used for all gravitational calculations.
 * Assumptions: fixed 5 M_sun BH + 0.4 M_sun Roche-lobe-filling red dwarf,
 * circular 0.01 AU binary, nominal steady supply 1e-9 M_sun / Julian year.
 *
 * This is a conservative, deterministic two-body baseline, NOT a proof
 * that the disc remains persistently hot or the planets remain stable.
 * Stellar evolution, disc-instability physics, hydrodynamics, and N-body
 * perturbations must be assessed before calling it a complete simulation.
 */
(() => {
  'use strict';

  const SI=Object.freeze({
    G:6.67430e-11,
    AU_M:149597870700,
    SOLAR_MASS_KG:1.98847e30,
    SOLAR_RADIUS_M:6.957e8,
    DAY_S:86400,
    JULIAN_YEAR_S:31557600,
    C_M_S:299792458,
    // Standard approximately 1.26e31 W per solar mass.
    EDDINGTON_LUMINOSITY_PER_SOLAR_MASS_W:1.26e31
  });
  const BH_MASS_SOLAR=5;
  const DONOR_MASS_SOLAR=0.4;
  const BINARY_SEPARATION_AU=0.01;
  // A 0.4-M_sun red dwarf is near its Roche-lobe-filling size at 0.01 AU.
  // This is a fixed donor parameter, not a self-consistent stellar model.
  const DONOR_RADIUS_SOLAR=0.416;
  const NOMINAL_TRANSFER_MASS_SOLAR_PER_YEAR=1e-9;
  const RADIATIVE_EFFICIENCY=.10;
  const ORBIT_INCLINATION_RAD=12*Math.PI/180;
  const TOTAL_MASS_SOLAR=BH_MASS_SOLAR+DONOR_MASS_SOLAR;
  const MEAN_MOTION_RAD_S=Math.sqrt(
    SI.G*TOTAL_MASS_SOLAR*SI.SOLAR_MASS_KG/
    Math.pow(BINARY_SEPARATION_AU*SI.AU_M,3));
  const BINARY_PERIOD_SECONDS=2*Math.PI/MEAN_MOTION_RAD_S;

  function eggletonFraction(q){
    if(!(q>0)||!Number.isFinite(q))throw new RangeError('Roche mass ratio must be positive and finite');
    const q13=Math.cbrt(q),q23=q13*q13;
    return .49*q23/(.60*q23+Math.log(1+q13));
  }
  const donorRocheRadiusAU=BINARY_SEPARATION_AU*
    eggletonFraction(DONOR_MASS_SOLAR/BH_MASS_SOLAR);
  const blackHoleRocheRadiusAU=BINARY_SEPARATION_AU*
    eggletonFraction(BH_MASS_SOLAR/DONOR_MASS_SOLAR);
  const donorFillFactor=DONOR_RADIUS_SOLAR*SI.SOLAR_RADIUS_M/
    (donorRocheRadiusAU*SI.AU_M);

  const blackHole=Object.freeze({
    id:'BLACK_HOLE',massSolar:BH_MASS_SOLAR,
    gravitationalRadiusKm:SI.G*BH_MASS_SOLAR*SI.SOLAR_MASS_KG/
      (SI.C_M_S*SI.C_M_S)/1000,
    schwarzschildRadiusKm:2*SI.G*BH_MASS_SOLAR*SI.SOLAR_MASS_KG/
      (SI.C_M_S*SI.C_M_S)/1000,
    visible:false
  });
  const companion=Object.freeze({
    id:'DONOR_STAR',kind:'red-dwarf',massSolar:DONOR_MASS_SOLAR,
    radiusSolar:DONOR_RADIUS_SOLAR,
    rocheLobeRadiusAU:donorRocheRadiusAU,
    rocheFillFactor:donorFillFactor,
    massTransferMechanism:'Roche-lobe overflow',
    visible:false
  });
  const binary=Object.freeze({
    kind:'circular-two-body',separationAU:BINARY_SEPARATION_AU,
    totalMassSolar:TOTAL_MASS_SOLAR,periodSeconds:BINARY_PERIOD_SECONDS,
    inclinationRadians:ORBIT_INCLINATION_RAD,
    donorRocheRadiusAU,blackHoleRocheRadiusAU,
    // These are radii about the SYSTEM BARYCENTRE, not the separation.
    blackHoleBarycentricRadiusAU:
      BINARY_SEPARATION_AU*DONOR_MASS_SOLAR/TOTAL_MASS_SOLAR,
    donorBarycentricRadiusAU:
      BINARY_SEPARATION_AU*BH_MASS_SOLAR/TOTAL_MASS_SOLAR
  });

  function vectorAt(signedRadiusAU,phase){
    const cosine=Math.cos(phase),sine=Math.sin(phase);
    const tilt=Math.cos(ORBIT_INCLINATION_RAD);
    const lift=Math.sin(ORBIT_INCLINATION_RAD);
    const positionAU=Object.freeze([
      signedRadiusAU*cosine,
      signedRadiusAU*sine*tilt,
      signedRadiusAU*sine*lift
    ]);
    const speedMetresPerSecond=signedRadiusAU*SI.AU_M*MEAN_MOTION_RAD_S;
    const velocityMetresPerSecond=Object.freeze([
      -speedMetresPerSecond*sine,
      speedMetresPerSecond*cosine*tilt,
      speedMetresPerSecond*cosine*lift
    ]);
    return Object.freeze({positionAU,velocityMetresPerSecond});
  }

  function binaryAt(simulatedSeconds){
    if(!Number.isFinite(simulatedSeconds))throw new RangeError('Simulation time must be finite seconds');
    // Keep precision for long-running clocks and direct event-time jumps.
    const phase=(simulatedSeconds % BINARY_PERIOD_SECONDS)*
      2*Math.PI/BINARY_PERIOD_SECONDS;
    const bh=vectorAt(-binary.blackHoleBarycentricRadiusAU,phase);
    const donor=vectorAt(binary.donorBarycentricRadiusAU,phase);
    return Object.freeze({
      timeSeconds:simulatedSeconds,
      orbitalPhaseRadians:phase,
      blackHole:bh,
      donor,
      separationAU:BINARY_SEPARATION_AU
    });
  }

  const accretion=Object.freeze({
    source:'DONOR_STAR',
    mechanism:'Roche-lobe overflow into an accretion disc',
    nominalTransferSolarMassesPerJulianYear:NOMINAL_TRANSFER_MASS_SOLAR_PER_YEAR,
    nominalTransferKgPerSecond:
      NOMINAL_TRANSFER_MASS_SOLAR_PER_YEAR*
      SI.SOLAR_MASS_KG/SI.JULIAN_YEAR_S,
    assumedRadiativeEfficiency:RADIATIVE_EFFICIENCY,
    nominalLuminosityWatts:
      NOMINAL_TRANSFER_MASS_SOLAR_PER_YEAR*
      SI.SOLAR_MASS_KG/SI.JULIAN_YEAR_S*
      RADIATIVE_EFFICIENCY*SI.C_M_S**2,
    eddingtonLuminosityWatts:
      SI.EDDINGTON_LUMINOSITY_PER_SOLAR_MASS_W*BH_MASS_SOLAR,
    // Geometrical estimate only; NOT a validated disc truncation model.
    illustrativeOuterDiscLimitAU:blackHoleRocheRadiusAU*.8,
    stellarEvolutionIncluded:false,
    viscousDelayModelIncluded:false,
    thermalStabilityValidated:false,
    variabilityModelIncluded:false,
    visible:false
  });

  // Accepted orbital distances, now around the combined binary barycentre.
  // Periods are accurate for the point-mass Kepler approximation. These
  // are NOT integrated 3D orbits: secular effects and resonances are pending.
  const distances=Object.freeze([
    ['CINDER',.30],['SILEX',.42],['VERDANT',.55],['RUST',.75],
    ['ATLAS',1.00],['HALO',1.30],['AZURE',1.75],['UMBRA',2.40]
  ].map(([name,semimajorAxisAU])=>Object.freeze({name,semimajorAxisAU})));

  function planetPeriodSeconds(semimajorAxisAU){
    if(!(semimajorAxisAU>0)||!Number.isFinite(semimajorAxisAU))
      throw new RangeError('Semimajor axis must be positive finite AU');
    const semimajorAxisMetres=semimajorAxisAU*SI.AU_M;
    return 2*Math.PI*Math.sqrt(
      Math.pow(semimajorAxisMetres,3)/
      (SI.G*TOTAL_MASS_SOLAR*SI.SOLAR_MASS_KG));
  }
  const plannedPlanets=Object.freeze(distances.map(p=>Object.freeze({
    ...p,keplerPeriodSeconds:planetPeriodSeconds(p.semimajorAxisAU),
    keplerPeriodDays:planetPeriodSeconds(p.semimajorAxisAU)/SI.DAY_S
  })));

  const metadata=Object.freeze({
    stage:'physical-baseline-v1',
    epoch:'simulation t=0, not a civil calendar date',
    integration:'exact circular two-body ephemeris; outer planets point-mass periods only',
    visualIntegration:false,
    eventClockIntegrated:false,
    dynamicallyStableEightPlanetSystemVerified:false,
    notes:'Mass transfer and disc persistence are assumptions to be validated; no renderer changes.'
  });

  const api=Object.freeze({
    SI,blackHole,companion,binary,accretion,plannedPlanets,metadata,
    eggletonFraction,binaryAt,planetPeriodSeconds
  });
  if(typeof window!=='undefined')window.EventHorizonPhysicalSystem=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})();