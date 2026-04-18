#ifndef COMMITGRAPH_H
#define COMMITGRAPH_H
// all h files mein se remove namespace and include explicitly std:: and also remove bits/stdc++.h 
#include<iostream>
#include<bits/stdc++.h>
using namespace std;

class CommitGraph
{
private:
    unordered_map<string,string>              parent;   // commitID → parentID
    unordered_map<string,vector<string>> children; // commitID → [childIDs]

    static const string GRAPH_PATH;

public:
    CommitGraph();  

    void addCommit(const string &commitID, const string &parentID);
    string getParent(const string &commitID);
    vector<string> getChildren(const string &commitID);

    void printHistory(const string &head);

    // Export parent map (used by GarbageCollector for mark-and-sweep)
    unordered_map<string, string> getParentMap();

    void save();

    void load();
};

#endif