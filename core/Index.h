#ifndef INDEX_H
#define INDEX_H

#include<iostream>
#include<bits/stdc++.h>
using namespace std;

class Index
{
private:

    unordered_map<string,string> staged;

public:
    void stage(const string &file, const string &hash);

    string getHash(const string &file);

    vector<string> getStagedFiles();

    bool isStaged(const string &file);

    void clear();

    void save();
    void load();
};

#endif