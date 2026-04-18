#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "LineDiff.h"

vector<string> LineDiff::splitLines(const string &text)
{
    vector<string> lines;
    stringstream ss(text);

    string line;

    while(getline(ss,line))
    {
        lines.push_back(line);
    }

    return lines;
}

vector<vector<int>> LineDiff::buildLCSTable(const vector<string> &A,const vector<string> &B)
{

    int n = A.size();
    int m = B.size();

    vector<vector<int>> dp(n+1,vector<int>(m+1,0));

    for(int i=1;i<=n;i++)
    {
        for(int j=1;j<=m;j++)
        {
            if(A[i-1]==B[j-1])
            {
                dp[i][j]=dp[i-1][j-1]+1;
            }
            else
            {
                dp[i][j]=max(dp[i-1][j],dp[i][j-1]);
            }

        }
    }

    return dp;
}

vector<string> LineDiff::generatePatch(const vector<string> &A,const vector<string> &B)
{
    vector<vector<int>> dp=buildLCSTable(A,B);

    int i=A.size();
    int j=B.size();

    vector<string> patch;

    while(i>0 && j>0)
    {
        if(A[i-1]==B[j-1])
        {
            patch.push_back("  " + A[i-1]);
            i--;
            j--;
        }

        else if(dp[i-1][j] > dp[i][j-1])
        {
            patch.push_back("- "+A[i-1]);
            i--;
        }

        else
        {
            patch.push_back("+ "+B[j-1]);
            j--;
        }

    }

    while(i>0)
    {
        patch.push_back("- "+A[i-1]);
        i--;
    }

    while(j>0)
    {
        patch.push_back("+ "+B[j-1]);
        j--;
    }

    reverse(patch.begin(),patch.end());

    return patch;
}

string LineDiff::applyPatch(const string &original, const vector<string> &patch)
{

    vector<string> lines=splitLines(original);

    vector<string> result;

    size_t index=0;

    for(auto &p:patch)
    {

        if(!p.empty() && p[0]==' ')
        {
            result.push_back(lines[index]);
            index++;
        }

        else if(!p.empty() && p[0]=='-')
        {
            index++;
        }

        else if(!p.empty() && p[0]=='+')
        {
            result.push_back(p.substr(2));
        }

    }

    while(index<lines.size())
    {
        result.push_back(lines[index]);
        index++;
    }

    string output;
    for (size_t i = 0; i < result.size(); ++i)
    {
        output += result[i];
        if (i < result.size() - 1)
            output += "\n";
    }

    return output;
}

void LineDiff::showPatch(const vector<string> &patch)
{

    cout<<"Patch"<<endl;

    for(auto &line:patch)
    {
        cout<<line<<"\n";
    }

}