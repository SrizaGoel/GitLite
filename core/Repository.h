#ifndef REPOSITORY_H
#define REPOSITORY_H

#include<iostream>
using namespace std;
#include <string>

#include "../storage/FileManager.h"
#include "../storage/ObjectStore.h"
#include "../algorithms/SHA1.h"
#include "../algorithms/LineDiff.h"
#include "../algorithms/CommitGraph.h"
#include "../features/BranchManager.h"
#include "../features/SearchIndex.h"
#include "../features/Statistics.h"
#include "../features/GarbageCollector.h"
#include "Index.h"
#include "Commit.h"

class Repository
{
private:
    FileManager      fileManager;
    ObjectStore      objectStore;
    LineDiff         diffEngine;
    CommitGraph      commitGraph;
    BranchManager    branchManager;
    SearchIndex      searchIndex;
    Statistics       statistics;
    GarbageCollector garbageCollector;
    Index            index;

    string getPreviousHash(const string &filename);

    void restoreCommit(const string &commitID);

public:
    Repository();

    void init();
    void add(const string &file);
    void status();
    void commit(const string &message);
    void log();
    void diff(const string &file1, const string &file2);
    void branch(const string &name);
    void checkout(const string &target); 
    void search(const string &keyword);
    void stats(const string &file1, const string &file2);
    void restoreFile(const string &commitID, const string &filename);
    void diffWithCommit(const string &commitID, const string &filename);
    void gc();
    void graph();
    void branches(); 
};

#endif