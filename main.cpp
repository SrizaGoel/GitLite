#include <iostream>
using namespace std;

#include "core/Repository.h"

int main(int argc,char* argv[])
{
    Repository repo;
    if(argc<2)
    {
        cout<<"Usage: gitlite <command>\n";
        return 0;
    }
    string cmd=argv[1];
    if(cmd=="init")
    {
        repo.init();
    }
    else if(cmd=="add")
    {
        if(argc<3)
        {
            cout<<"Usage: gitlite add <file>\n";
            return 0;
        }
        repo.add(argv[2]);
    }
    else if(cmd=="status")
    {
        repo.status();
    }
    else if(cmd=="commit")
    {
        if(argc<3)
        {
            cout<<"Usage: gitlite commit \"message\"\n";
            return 0;
        }
        repo.commit(argv[2]);
    }
    else if(cmd=="log")
    {
        repo.log();
    }
    else if(cmd=="diff")
    {
        if(argc<4)
        {
            cout<<"Usage: gitlite diff <file1> <file2>\n";
            return 0;
        }
        repo.diff(argv[2], argv[3]);
    }
    else if(cmd=="branch")
    {
        string bname = argv[2];
        string cid = (argc > 3) ? argv[3] : "";
        repo.branch(bname, cid);
    }

    else if(cmd=="checkout")
    {
        if(argc<3)
        {
            cout<<"Usage: gitlite checkout <branch>\n";
            return 0;
        }
        repo.checkout(argv[2]);
    }
    else if(cmd=="search")
    {
        if(argc<3)
        {
            cout<<"Usage: gitlite search <keyword>\n";
            return 0;
        }

        repo.search(argv[2]);
    }
    else if(cmd=="stats")
    {
        if(argc<4)
        {
            cout<<"Usage: gitlite stats <file1> <file2>\n";
            return 0;
        }

        repo.stats(argv[2],argv[3]);
    }

    else if(cmd=="gc")
    {
        repo.gc();
    }
    else if(cmd=="graph")
    {
        repo.graph();
    }
    else if(cmd=="restore")
    {
        if(argc<4)
        {
            cout<<"Usage: gitlite restore <commitID> <filename>\n";
            return 0;
        }
        repo.restoreFile(argv[2], argv[3]);
    }
    else if(cmd=="diff-commit")
    {
        if(argc<4)
        {
            cout<<"Usage: gitlite diff-commit <commitID> <filename>\n";
            return 0;
        }
        repo.diffWithCommit(argv[2], argv[3]);
    }
    else
    {
        cout<<"Unknown command\n";
    }
    return 0;
}