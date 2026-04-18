#ifndef GARBAGECOLLECTOR_H
#define GARBAGECOLLECTOR_H

#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include<iostream>
using namespace std;

class GarbageCollector
{
private:
    unordered_set<string> reachable; 

    void mark(const string &commitID, const unordered_map<string, string> &parentMap);

public:
    void collect(const vector<string> &branchHeads,unordered_map<string, string> &parentMap );

    unordered_set<string> markReachable(const vector<string> &heads,const unordered_map<string, string> &parentMap );

    void sweep(const unordered_set<string> &reachableCommits);
};

#endif