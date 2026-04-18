#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "Index.h"

void Index::stage(const string &file, const string &hash)
{
    staged[file] = hash;
}

string Index::getHash(const string &file)
{
    if (staged.count(file))
        return staged[file];
    return "";
}

vector<string> Index::getStagedFiles()
{
    vector<string> files;
    for (auto &p : staged)
        files.push_back(p.first);
    return files;
}

bool Index::isStaged(const string &file)
{
    return staged.count(file) > 0;
}

void Index::clear()
{
    staged.clear();
    save(); 
}

void Index::save()
{
    ofstream out(".gitlite/index");
    for (auto &p : staged)
        out << p.first << " " << p.second << endl;
    out.close();
}

void Index::load()
{
    staged.clear();
    ifstream in(".gitlite/index");
    if (!in.is_open()) return; 

    string line;
    while (getline(in, line))
    {
        size_t space = line.find(' ');
        if (space == string::npos) continue;
        string file = line.substr(0, space);
        string hash = line.substr(space + 1);
        staged[file] = hash;
    }
}   