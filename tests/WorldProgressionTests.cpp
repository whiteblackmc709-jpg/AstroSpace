#include "core/WorldProgression.h"

#include <cassert>
#include <iostream>

using namespace astrospace;

int main() {
    PlanetWorldState world;
    world.seed = 42;

    assert(TryTransition(world, PlanetPhase::Primordial));
    assert(TryTransition(world, PlanetPhase::Stable));
    assert(TryTransition(world, PlanetPhase::Biosphere));
    assert(!TryTransition(world, PlanetPhase::Remnant));
    assert(world.revision == 3);

    assert(TryTransition(world, PlanetPhase::Civilized));
    assert(TryTransition(world, PlanetPhase::Declining));
    assert(TryTransition(world, PlanetPhase::CollapseWarning));
    assert(ApplyCollapseStress(world, 0.25));
    assert(world.stability == 0.75);
    assert(TryTransition(world, PlanetPhase::Collapsing));
    assert(ApplyCollapseStress(world, 1.0));
    assert(world.stability == 0.0);
    assert(TryTransition(world, PlanetPhase::Remnant));
    assert(world.phase == PlanetPhase::Remnant);

    PlayerProgress newPlayer;
    TravelGate homeExit;
    homeExit.isHomeworldExit = true;
    auto access = EvaluateTravelAccess(newPlayer, homeExit);
    assert(!access.allowed);
    assert(access.blockers.size() == 3);

    newPlayer.storyStage = 3;
    newPlayer.hasShip = true;
    newPlayer.hasQuantumDrive = true;
    access = EvaluateTravelAccess(newPlayer, homeExit);
    assert(access.allowed);

    TravelGate dangerousWorld;
    dangerousWorld.minLevel = 18;
    dangerousWorld.requiredStoryStage = 5;
    dangerousWorld.minScannerTier = 3;
    dangerousWorld.requiresShip = true;
    dangerousWorld.requiresQuantumDrive = true;
    dangerousWorld.requiresEnvironmentGear = true;

    access = EvaluateTravelAccess(newPlayer, dangerousWorld);
    assert(!access.allowed);
    newPlayer.level = 20;
    newPlayer.storyStage = 5;
    newPlayer.scannerTier = 3;
    newPlayer.hasEnvironmentGear = true;
    access = EvaluateTravelAccess(newPlayer, dangerousWorld);
    assert(access.allowed);

    std::cout << "WorldProgressionTests: ALL PASSED\n";
    return 0;
}
