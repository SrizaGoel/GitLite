#ifndef SEARCHINDEX_H
#define SEARCHINDEX_H

#include <string>
#include <unordered_map>
#include <vector>
#include<iostream>
using namespace std;

class SearchIndex
{
private:
    unordered_map<string,unordered_map<string, int>> index;

    static const string INDEX_PATH;

public:
    SearchIndex();

    void indexCommit(const string &message, const string &commitID);
    vector<string> search(const string &keyword);
    void printResults(const string &keyword);
    void save();
    void load();
};

#endif