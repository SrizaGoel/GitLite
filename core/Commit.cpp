#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "Commit.h"

string Commit::serialize() const
{
    stringstream ss;
    ss<<"id "<<id<<endl;
    ss<<"parent "<<(parentID.empty()?"NONE":parentID)<<endl;
    ss<<"message "<<msg<<endl;
    ss<<"timestamp "<<timestamp<<endl;
    ss<<"tree"<<endl;
    for (const auto &entry:fileTree)
    {
        ss<<entry.first<<" "<<entry.second<<endl;
    }

    return ss.str();
}

Commit Commit::deserialize(const string &data)
{
    Commit commit;
    stringstream ss(data);
    string line;
    bool inTree=false;
    while(getline(ss,line))
    {
        if(line.empty()) continue;
        if(line == "tree")
        {
            inTree = true;
            continue;
        }
        if (inTree)
        {
            // Each tree line is: "filename hash"
            size_t space = line.find(' ');
            if (space!=string::npos)
            {
                string filename = line.substr(0, space);
                string hash = line.substr(space + 1);
                commit.fileTree[filename] = hash;
            }
        }
        else
        {
            // Header fields: "key value"
            size_t space = line.find(' ');
            if (space == string::npos) continue;

            string key = line.substr(0, space);
            string value = line.substr(space + 1);
            if(key=="id")
                commit.id=value;
            else if(key=="parent")
                commit.parentID=(value == "NONE" ? "" : value);
            else if (key=="message")
               commit.msg=value;
            else if (key=="timestamp") 
                commit.timestamp=value;
        }
    }
    return commit;
}