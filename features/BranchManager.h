#ifndef BRANCHMANAGER_H
#define BRANCHMANAGER_H

#include<iostream>
#include<bits/stdc++.h>
using namespace std;

class BranchManager
{
private:
    unordered_map<string,string> branches; // name → commitID
    string currentBranch;

    static const string HEAD_PATH;
    static const string BRANCH_DIR;

    void saveBranch(const string &name);
    void loadAllBranches();

public:
    BranchManager();

    void createBranch(const string &name, const string &commitID);
    void switchBranch(const string &name);

    string getHeadCommit();
    void updateHeadCommit(const string &commitID);
    string getCurrentBranch();

    vector<string> listBranches();
    vector<string> getAllBranchHeads();
};

#endif