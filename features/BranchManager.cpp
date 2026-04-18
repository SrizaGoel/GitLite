#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "BranchManager.h"

namespace fs = std::filesystem;

const string BranchManager::HEAD_PATH = ".gitlite/HEAD";
const string BranchManager::BRANCH_DIR = ".gitlite/branches/";

BranchManager::BranchManager()
{
    loadAllBranches();
}

void BranchManager::loadAllBranches()
{
    branches.clear();
    
    ifstream headFile(HEAD_PATH);
    if (headFile.is_open())
    {
        getline(headFile, currentBranch);
        currentBranch.erase(currentBranch.find_last_not_of(" \n\r\t") + 1);
        headFile.close();
    }
    else
    {
        currentBranch = "main";
    }

    if (fs::exists(BRANCH_DIR))
    {
        for (const auto &entry : fs::directory_iterator(BRANCH_DIR))
        {
            if (fs::is_regular_file(entry.path()))
            {
                string name = entry.path().filename().string();
                ifstream branchFile(entry.path());
                string commitID;
                getline(branchFile, commitID);
                commitID.erase(commitID.find_last_not_of(" \n\r\t") + 1);
                branches[name] = commitID;
                branchFile.close();
            }
        }
    }
}

void BranchManager::saveBranch(const string &name)
{
    if (!fs::exists(BRANCH_DIR))
        fs::create_directories(BRANCH_DIR);

    ofstream branchFile(BRANCH_DIR + name);
    if (branchFile.is_open())
    {
        branchFile << branches[name] <<endl;
        branchFile.close();
    }
}

void BranchManager::createBranch(const string &name, const string &commitID)
{
    if (branches.count(name))
    {
        std::cout << "Branch already exists: " << name << "\n";
        return;
    }

    branches[name] = commitID;
    saveBranch(name);
    std::cout << "Created branch: " << name << "\n";
}

void BranchManager::switchBranch(const string &name)
{
    if (!branches.count(name))
    {
        cout << "Branch not found: " << name << endl;
        return;
    }

    currentBranch = name;
    ofstream headFile(HEAD_PATH);
    if (headFile.is_open())
    {
        headFile << name << endl;
        headFile.close();
    }
    cout << "Switched to branch: " << name << endl;
}

string BranchManager::getHeadCommit()
{
    if (branches.count(currentBranch))
        return branches[currentBranch];
    return "";
}

void BranchManager::updateHeadCommit(const string &commitID)
{
    branches[currentBranch] = commitID;
    saveBranch(currentBranch);
}

std::string BranchManager::getCurrentBranch()
{
    return currentBranch;
}

vector<string> BranchManager::listBranches()
{
    vector<string> result;
    for (auto const& it : branches)
        result.push_back(it.first);
    return result;
}

vector<string> BranchManager::getAllBranchHeads()
{
    vector<string> heads;
    for (auto const& [name, commitID] : branches)
    {
        if (!commitID.empty())
            heads.push_back(commitID);
    }
    return heads;
}