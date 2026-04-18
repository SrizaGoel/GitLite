CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -static

SRC_CORE = core/Commit.cpp core/Index.cpp core/Repository.cpp
SRC_FEATURES = features/BranchManager.cpp features/GarbageCollector.cpp features/SearchIndex.cpp features/Statistics.cpp
SRC_STORAGE = storage/FileManager.cpp storage/ObjectStore.cpp
SRC_ALGO = algorithms/CommitGraph.cpp algorithms/LineDiff.cpp algorithms/SHA1.cpp
SRC_MAIN = main.cpp

SOURCES = $(SRC_CORE) $(SRC_FEATURES) $(SRC_STORAGE) $(SRC_ALGO) $(SRC_MAIN)
OBJECTS = $(SOURCES:.cpp=.o)
TARGET = gitlite

all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJECTS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)

.PHONY: all clean
