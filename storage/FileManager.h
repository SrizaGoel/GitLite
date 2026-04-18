#ifndef FILEMANAGER_H
#define FILEMANAGER_H

#include<iostream>
#include<bits/stdc++.h>
using namespace std;

class FileManager
{
public:
    string readFile(const string &path);
    bool writeFile(const string &path, const string &content);
    bool fileExists(const string &path);
    void createDir(const string &path);
    vector<string> listDir(const string &path);
    vector<string> listAllFiles(const string &path);
};

#endif