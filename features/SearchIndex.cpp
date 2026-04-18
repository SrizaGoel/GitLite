#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "SearchIndex.h"

const string SearchIndex::INDEX_PATH = ".gitlite/index_search";

SearchIndex::SearchIndex() 
{
    load();
}

void SearchIndex::save() {
    ofstream out(INDEX_PATH);
    if (!out.is_open()) return;
    for (auto const& [word, commits] : index)
    {
        for (auto const& [id, count] : commits)
        {
            out << word << " " << id << " " << count << endl;
        }
    }
    out.close();
}

void SearchIndex::load() {
    index.clear();
    ifstream in(INDEX_PATH);
    if (!in.is_open()) return;
    string word, id;
    int count;
    while (in >> word >> id >> count)
    {
        index[word][id] = count;
    }
    in.close();
}
void SearchIndex::indexCommit(const string &message,const string &commitID)
{
    stringstream ss(message);
    unordered_set<std::string> stopWords = {
        "the","is","a","an","in","on","of","to","for","and"
    };
    string word;
    while(ss >> word)
    {
        string cleaned;
        for(char c : word)
        {
            if(isalpha(c))
                cleaned += tolower(c);
        }
        if(cleaned.empty())
            continue;
        if(stopWords.count(cleaned))
            continue;
        index[cleaned][commitID]++;
    }
}
std::vector<std::string> SearchIndex::search(const std::string &keyword)
{
    std::string key;
    for(char c : keyword)
    {
        if(isalpha(c))
            key += tolower(c);
    }
    std::vector<std::string> result;
    if(!index.count(key))
        return result;
    std::vector<std::pair<std::string,int>> ranked;
    for(auto &p : index[key])
    {
        ranked.push_back(p);
    }
    std::sort(ranked.begin(), ranked.end(),
        [](auto &a, auto &b)
        {
            return a.second > b.second;
        });
    for(auto &p : ranked)
    {
        result.push_back(p.first);
    }
    return result;
}
void SearchIndex::printResults(const std::string &keyword)
{
    std::vector<std::string> results = search(keyword);
    if(results.empty())
    {
        std::cout<<"No commits found\n";
        return;
    }
    std::cout<<"Commits ranked for \""<<keyword<<"\"\n";
    for(auto &id : results)
    {
        std::cout<<"  "<<id<<"\n";
    }
}