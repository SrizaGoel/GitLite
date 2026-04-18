#ifndef LINEDIFF_H
#define LINEDIFF_H

#include<iostream>
using namespace std;
#include <string>
#include <vector>

class LineDiff
{
public:

    vector<string> splitLines(const string &text);

    vector<vector<int>> buildLCSTable(const vector<string> &A,const vector<string> &B );

    vector<string> generatePatch(const vector<string> &A, const vector<string> &B );

    string applyPatch(const string &original, const vector<string> &patch );

    void showPatch(const vector<string> &patch);

};

#endif