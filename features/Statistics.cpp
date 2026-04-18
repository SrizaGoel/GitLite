#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "Statistics.h"

int Statistics::countAddedLines(const vector<string> &patch)
{

    int count=0;

    for(auto &line:patch)
    {
        if(line.size()>0 && line[0]=='+')
        {
            count++;
        }
    }

    return count;
}

int Statistics::countRemovedLines(const vector<string> &patch)
{

    int count=0;

    for(auto &line:patch)
    {
        if(line.size()>0 && line[0]=='-')
        {
            count++;
        }
    }

    return count;
}

void Statistics::showPatchStats(const vector<string> &patch)
{

    int added=countAddedLines(patch);

    int removed=countRemovedLines(patch);

    cout<<"Patch statistics\n";

    cout<<"Lines added: "<<added<<"\n";

    cout<<"Lines removed: "<<removed<<"\n";

}