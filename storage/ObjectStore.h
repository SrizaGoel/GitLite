#ifndef OBJECTSTORE_H
#define OBJECTSTORE_H

#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "../core/Commit.h"

struct PackEntry
{
    string hash;      
    string type;      
    string baseHash;  
    string data;      
};

class ObjectStore
{
private:

    unordered_map<string,string> packIndex;
    static const int PACK_THRESHOLD = 20;
    static const int MAX_DELTA_DEPTH = 10;

    string loosePath(const string &hash, const string &type = "objects");

    bool existsInLoose(const string &hash);

    bool existsInPack(const string &hash);

    string loadLooseRaw(const string &hash);

    string resolveDelta(const string &hash, int depth = 0);
    void loadPackIndexes();

    PackEntry loadFromPack(const string &hash);
    int countLooseObjects();

public:
    ObjectStore();

    void storeObject(const string &hash,const string &content,const string &prevHash = "");

    string loadObject(const string &hash);

    bool objectExists(const string &hash);

    void storeCommit(const Commit &commit);
    Commit loadCommit(const string &commitID);
    bool commitExists(const string &commitID);
    string resolveID(const string &prefix);

    vector<string> getAllCommitIDs();

    vector<string> getAllLooseHashes();

    void repack();

    void maybeRepack();

    string storePatch(const vector<string> &patch);

    vector<string> loadPatch(const string &patchID);

    string reconstructFile(const string &baseObject,const vector<string> &patch );
};

#endif