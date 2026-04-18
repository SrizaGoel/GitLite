#ifndef STATISTICS_H
#define STATISTICS_H

#include <string>
#include <vector>
#include<iostream>
using namespace std;

class Statistics
{

public:

    int countAddedLines(const vector<string> &patch);

    int countRemovedLines(const vector<string> &patch);

    void showPatchStats(const vector<string> &patch);

};

#endif