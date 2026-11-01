#pragma once

#include <algorithm>
#include <cstdint>
#include <string>
#include <vector>

namespace astrospace {

enum class PlanetPhase : std::uint8_t {
    Formation = 0,
    Primordial,
    Stable,
    Biosphere,
    Civilized,
    Declining,
    CollapseWarning,
    Collapsing,
    Remnant
};

struct PlanetWorldState {
    PlanetPhase phase{PlanetPhase::Formation};
    double stability{1.0};
    std::uint64_t seed{0};
    std::uint64_t revision{0};
};

inline bool CanTransition(PlanetPhase current, PlanetPhase next) noexcept {
    const auto currentValue = static_cast<std::uint8_t>(current);
    const auto nextValue = static_cast<std::uint8_t>(next);
    return nextValue == static_cast<std::uint8_t>(currentValue + 1);
}

inline bool TryTransition(PlanetWorldState& state, PlanetPhase next) noexcept {
    if (!CanTransition(state.phase, next)) {
        return false;
    }
    state.phase = next;
    if (next == PlanetPhase::Remnant) {
        state.stability = 0.0;
    }
    ++state.revision;
    return true;
}

inline bool ApplyCollapseStress(PlanetWorldState& state, double stress) noexcept {
    if (state.phase != PlanetPhase::CollapseWarning &&
        state.phase != PlanetPhase::Collapsing) {
        return false;
    }
    if (stress < 0.0) {
        return false;
    }
    state.stability = std::max(0.0, state.stability - stress);
    ++state.revision;
    return true;
}

struct PlayerProgress {
    int level{1};
    int storyStage{0};
    int scannerTier{0};
    bool hasShip{false};
    bool hasQuantumDrive{false};
    bool hasEnvironmentGear{false};
    bool hasVoidAdaptation{false};
};

struct TravelGate {
    bool isHomeworldExit{false};
    int minLevel{1};
    int requiredStoryStage{0};
    int minScannerTier{0};
    bool requiresShip{false};
    bool requiresQuantumDrive{false};
    bool requiresEnvironmentGear{false};
    bool requiresVoidAdaptation{false};
};

struct AccessResult {
    bool allowed{false};
    std::vector<std::string> blockers;
};

inline AccessResult EvaluateTravelAccess(
    const PlayerProgress& player,
    const TravelGate& gate
) {
    AccessResult result;
    if (gate.isHomeworldExit && player.storyStage < 3) {
        result.blockers.emplace_back("Complete the homeworld launch authorization story.");
    }
    if (player.level < gate.minLevel) {
        result.blockers.emplace_back("Reach the required character level.");
    }
    if (player.storyStage < gate.requiredStoryStage) {
        result.blockers.emplace_back("Complete the required story chapter.");
    }
    if (player.scannerTier < gate.minScannerTier) {
        result.blockers.emplace_back("Upgrade the scanner and gather the required survey data.");
    }
    if ((gate.requiresShip || gate.isHomeworldExit) && !player.hasShip) {
        result.blockers.emplace_back("Acquire and register an expedition ship.");
    }
    if ((gate.requiresQuantumDrive || gate.isHomeworldExit) && !player.hasQuantumDrive) {
        result.blockers.emplace_back("Install and calibrate a quantum navigation core.");
    }
    if (gate.requiresEnvironmentGear && !player.hasEnvironmentGear) {
        result.blockers.emplace_back("Prepare the required environmental protection.");
    }
    if (gate.requiresVoidAdaptation && !player.hasVoidAdaptation) {
        result.blockers.emplace_back("Unlock the required void adaptation.");
    }
    result.allowed = result.blockers.empty();
    return result;
}

} // namespace astrospace
