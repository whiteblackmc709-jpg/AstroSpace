cmake_minimum_required(VERSION 3.16)
project(AstroSpaceFoundation LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(astrospace_world_tests tests/WorldProgressionTests.cpp)
target_include_directories(astrospace_world_tests PRIVATE src)
if(MSVC)
  target_compile_options(astrospace_world_tests PRIVATE /W4 /permissive-)
else()
  target_compile_options(astrospace_world_tests PRIVATE -Wall -Wextra -Wpedantic)
endif()

enable_testing()
add_test(NAME world_progression COMMAND astrospace_world_tests)
