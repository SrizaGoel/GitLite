#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "CommitGraph.h"

namespace fs = std::filesystem;

const string CommitGraph::GRAPH_PATH = ".gitlite/commit_graph";

CommitGraph::CommitGraph()
{
    load();
}

void CommitGraph::addCommit(const string &commitID, const string &parentID)
{
    parent[commitID] = parentID;

    if (!parentID.empty())
        children[parentID].push_back(commitID);

    save(); 
}

string CommitGraph::getParent(const string &commitID)
{
    if (parent.count(commitID))
        return parent[commitID];
    return "";
}

vector<string> CommitGraph::getChildren(const string &commitID)
{
    if (children.count(commitID))
        return children[commitID];
    return {};
}

void CommitGraph::printHistory(const string &head)
{
    if (head.empty())
    {
        cout << "No commits yet"<<endl;
        return;
    }

    string current = head;
    while (!current.empty())
    {
        std::cout << "commit " << current << endl;
        current = getParent(current);
    }
}

unordered_map<string,string> CommitGraph::getParentMap()
{
    return parent;
}

void CommitGraph::save()
{
    if (!fs::exists(".gitlite")) return;

    ofstream out(GRAPH_PATH);
    for (auto &p : parent)
    {
        out << p.first << " " << (p.second.empty() ? "NONE" : p.second) << endl;
    }
    out.close();
}

void CommitGraph::load()
{
    parent.clear();
    children.clear();

    ifstream in(GRAPH_PATH);
    if (!in.is_open()) return;

    string line;
    while (getline(in, line))
    {
        stringstream ss(line);
        string commitID, parentID;
        ss >> commitID >> parentID;

        if (commitID.empty()) continue;

        parent[commitID] = (parentID == "NONE" ? "" : parentID);

        if (!parentID.empty() && parentID != "NONE")
            children[parentID].push_back(commitID);
    }
}