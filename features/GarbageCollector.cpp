#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "GarbageCollector.h"

namespace fs = std::filesystem;

void GarbageCollector::mark(const string &commitID,const unordered_map<string, string> &parentMap)
{
    if (commitID.empty() || reachable.count(commitID))
        return;

    reachable.insert(commitID);

    auto it = parentMap.find(commitID);
    if (it != parentMap.end() && !it->second.empty())
        mark(it->second, parentMap);
}

unordered_set<string> GarbageCollector::markReachable(const vector<string> &heads,const unordered_map<string, string> &parentMap)
{
    reachable.clear();

    for (const auto &head : heads)
        mark(head, parentMap);

    return reachable;
}

void GarbageCollector::sweep(const unordered_set<string> &reachableCommits)
{
    string commitDir = ".gitlite/commits";
    if (!fs::exists(commitDir)) return;

    int removedCommits = 0;
    unordered_set<string> referencedHashes;

    for (const auto &entry : fs::directory_iterator(commitDir))
    {
        if (!fs::is_regular_file(entry.path())) continue;

        string commitID = entry.path().filename().string();

        if (!reachableCommits.count(commitID))
        {
            fs::remove(entry.path());
            removedCommits++;
            std::cout << "[gc] Removed unreachable commit: " << commitID.substr(0, 8) << "...\n";
        }
        else
        {
            ifstream f(entry.path());
            string line;
            bool inTree = false;
            while (std::getline(f, line))
            {
                if (line == "tree") { inTree = true; continue; }
                if (inTree)
                {
                    size_t space = line.find(' ');
                    if (space != std::string::npos)
                        referencedHashes.insert(line.substr(space + 1));
                }
            }
        }
    }

    string looseDir = ".gitlite/objects/loose";
    int removedObjects = 0;

    if (fs::exists(looseDir))
    {
        for (const auto &subdir : fs::directory_iterator(looseDir))
        {
            if (!fs::is_directory(subdir)) continue;
            string prefix = subdir.path().filename().string();

            for (const auto &file : fs::directory_iterator(subdir.path()))
            {
                if (!fs::is_regular_file(file.path())) continue;

                std::string hash = prefix + file.path().filename().string();

                if (!referencedHashes.count(hash))
                {
                    fs::remove(file.path());
                    removedObjects++;
                }
            }

            if (fs::is_empty(subdir.path()))
                fs::remove(subdir.path());
        }
    }

    cout << "[gc] Removed " << removedCommits << " unreachable commits\n";
    cout << "[gc] Removed " << removedObjects << " orphaned objects\n";
}

void GarbageCollector::collect(const vector<string> &branchHeads,unordered_map<string, string> &parentMap)
{
    cout << "[gc] Starting garbage collection...\n";

    auto reachableCommits = markReachable(branchHeads, parentMap);
    std::cout << "[gc] Marked " << reachableCommits.size() << " reachable commits\n";
    sweep(reachableCommits);

    std::cout << "[gc] Done\n";
}