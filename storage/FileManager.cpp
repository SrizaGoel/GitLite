#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "FileManager.h"

namespace fs=filesystem;
string FileManager::readFile(const string &path)
{
    ifstream file(path);
    if(!file.is_open())
    {
        cout<<"Cannot open: "<<path<<endl;
        return "";
    }
    stringstream buffer;
    buffer<<file.rdbuf();
    return buffer.str();
}

bool FileManager::writeFile(const string &path, const string &content)
{
    fs::path p(path);
    if (p.has_parent_path() && !fs::exists(p.parent_path()))
    {
        fs::create_directories(p.parent_path());
    }

    ofstream file(path);
    if(!file.is_open())
    {
        cout<<"Cannot write: "<<path<<endl;
        return false;
    }
    file<<content;
    file.close();    
    return true;
}

bool FileManager::fileExists(const string &path)
{
    return fs::exists(path);
}

void FileManager::createDir(const string &path)
{
    if (!fs::exists(path))
        fs::create_directories(path);
}

vector<string> FileManager::listDir(const string &path)
{
    vector<string>result;
    if(!fs::exists(path))return result;

    for(const auto &entry:fs::directory_iterator(path))
    {
        if (fs::is_regular_file(entry.path()))
            result.push_back(entry.path().filename().string());
    }
    return result;
}

vector<string>FileManager::listAllFiles(const string &path)
{
    vector<string>result;
    if(!fs::exists(path))return result;

    for (const auto &entry:fs::recursive_directory_iterator(path))
    {
        if (fs::is_regular_file(entry.path()))
            result.push_back(entry.path().string());
    }
    return result;
}