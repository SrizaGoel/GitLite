#ifndef COMMIT_H
#define COMMIT_H

#include<iostream>
#include<bits/stdc++.h>
using namespace std;

class Commit
{
public:
    string id;
    string parentID;
    string msg;
    string timestamp;
    map<string,string> fileTree;  // if unordered ?
    string serialize() const;
    static Commit deserialize(const std::string &data);
};

#endif