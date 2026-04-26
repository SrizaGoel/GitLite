#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "Repository.h"

namespace fs = filesystem;

Repository::Repository()
{
    if (!fs::exists(".gitlite"))
    {
        init();
    }
    index.load();
}

void Repository::init()
{
    if (fs::exists(".gitlite"))
    {
        cout << "Repository already initialized\n";
        return;
    }

    fs::create_directories(".gitlite/objects/loose");
    fs::create_directories(".gitlite/objects/pack");
    fs::create_directories(".gitlite/commits");
    fs::create_directories(".gitlite/branches");

    fileManager.writeFile(".gitlite/HEAD", "main\n");

    fileManager.writeFile(".gitlite/branches/main", "");

    cout << "Initialized empty GitLite repository in .gitlite/\n";
}

string Repository::getPreviousHash(const string &filename)
{
    string headCommit = branchManager.getHeadCommit();
    if (headCommit.empty()) return ""; 

    if (!objectStore.commitExists(headCommit)) return "";

    Commit lastCommit = objectStore.loadCommit(headCommit);

    auto it = lastCommit.fileTree.find(filename);
    if (it != lastCommit.fileTree.end())
        return it->second;

    return ""; 
}

void Repository::add(const string &file)
{
    if (!fs::exists(file))
    {
        cout << "File not found: " << file << "\n";
        return;
    }

    string content = fileManager.readFile(file);
    string hash    = SHA1::hash(content);  

    string prevHash = getPreviousHash(file);

    objectStore.storeObject(hash, content, prevHash);

    index.stage(file, hash);
    index.save(); 

    cout << "Staged: " << file << " (" << hash.substr(0,8) << "...)\n";
}

void Repository::status()
{
    cout << "On branch: " << branchManager.getCurrentBranch() << "\n";
    auto files = index.getStagedFiles();

    if (files.empty())
    {
        cout << "Nothing staged for commit\n";
        return;
    }

    cout << "Staged files:\n";
    for (auto &f : files)
        cout << "  + " << f << "  (" << index.getHash(f).substr(0,8) << "...)\n";
}

void Repository::commit(const string &message)
{
    auto stagedFiles = index.getStagedFiles();
    if (stagedFiles.empty())
    {
        cout << "Nothing to commit\n";
        return;
    }

    map<string, string> newFileTree;
    string parentID = branchManager.getHeadCommit();

    if (!parentID.empty() && objectStore.commitExists(parentID))
    {
        Commit parent = objectStore.loadCommit(parentID);
        newFileTree   = parent.fileTree; 
    }

    for (auto &file : stagedFiles)
        newFileTree[file] = index.getHash(file);

    auto t = time(nullptr);
    stringstream ts;
    ts << put_time(localtime(&t), "%Y-%m-%d %H:%M:%S");

    Commit commit;
    commit.parentID  = parentID;
    commit.msg   = message;
    commit.timestamp = ts.str();
    commit.fileTree  = newFileTree;

    commit.id = SHA1::hash(commit.serialize());

    objectStore.storeCommit(commit);
    commitGraph.addCommit(commit.id, parentID);
    branchManager.updateHeadCommit(commit.id);
    searchIndex.indexCommit(message, commit.id);
    searchIndex.save();

    index.clear(); 

    cout << "[" << branchManager.getCurrentBranch() << " "<< commit.id.substr(0, 8) << "] " << message << "\n";
    cout << commit.fileTree.size() << " file(s) in snapshot\n";
}

void Repository::log()
{
    string current = branchManager.getHeadCommit();

    if (current.empty())
    {
        cout << "No commits yet\n";
        return;
    }

    while (!current.empty())
    {
        if (!objectStore.commitExists(current)) break;

        Commit c = objectStore.loadCommit(current);

        cout << "─────────────────────────────\n";
        cout << "commit  " << c.id         << "\n";
        cout << "date    " << c.timestamp  << "\n";
        cout << "message " << c.msg        << "\n";

        current = c.parentID;
    }
    cout << "─────────────────────────────\n";
}

void Repository::diff(const string &file1, const string &file2)
{
    if (!fs::exists(file1) || !fs::exists(file2))
    {
        cout << "File not found\n";
        return;
    }

    string c1 = fileManager.readFile(file1);
    string c2 = fileManager.readFile(file2);

    auto A     = diffEngine.splitLines(c1);
    auto B     = diffEngine.splitLines(c2);
    auto patch = diffEngine.generatePatch(A, B);

    cout << "diff " << file1 << " → " << file2 << "\n";
    diffEngine.showPatch(patch);
}

void Repository::restoreCommit(const string &commitID)
{
    if (!objectStore.commitExists(commitID))
    {
        cout << "Commit not found: " << commitID << "\n";
        return;
    }

    Commit c = objectStore.loadCommit(commitID);

    bool allSuccess = true;
    for (auto &entry : c.fileTree) 
    {
        string filename = entry.first;
        string hash     = entry.second;

        string content = objectStore.loadObject(hash);

        if (fileManager.writeFile(filename, content))
        {
            cout << "  restored: " << filename << "\n";
        }
        else
        {
            cout << "[error] Failed to restore: " << filename << "\n";
            allSuccess = false;
        }
    }
    
    if (allSuccess)
        cout << "Restored all files from commit " << commitID.substr(0, 8) << "\n";
}

void Repository::restoreFile(const string &commitID, const string &filename)
{
    if (!objectStore.commitExists(commitID))
    {
        cout << "Commit not found: " << commitID << "\n";
        return;
    }

    Commit c = objectStore.loadCommit(commitID);

    auto it = c.fileTree.find(filename);
    if (it == c.fileTree.end())
    {
        cout << "File '" << filename << "' not found in commit " << commitID.substr(0, 8) << "\n";
        return;
    }

    string hash = it->second;
    string content = objectStore.loadObject(hash);

    if (fileManager.writeFile(filename, content))
    {
        cout << "  restored: " << filename << " from commit " << commitID.substr(0, 8) << "\n";
    }
    else
    {
        cout << "[error] Failed to write file: " << filename << "\n";
    }
}

void Repository::diffWithCommit(const string &commitID, const string &filename)
{
    if (!objectStore.commitExists(commitID))
    {
        cout << "Commit not found: " << commitID << "\n";
        return;
    }

    Commit c = objectStore.loadCommit(commitID);

    auto it = c.fileTree.find(filename);
    if (it == c.fileTree.end())
    {
        cout << "File '" << filename << "' not found in commit " << commitID.substr(0, 8) << "\n";
        return;
    }

    if (!fs::exists(filename))
    {
        cout << "File on disk not found: " << filename << "\n";
        return;
    }

    string hash    = it->second;
    string oldContent = objectStore.loadObject(hash);
    string newContent = fileManager.readFile(filename);

    auto A     = diffEngine.splitLines(oldContent);
    auto B     = diffEngine.splitLines(newContent);
    auto patch = diffEngine.generatePatch(A, B);

    cout << "Diff check: " << filename << " (Disk) vs " << commitID.substr(0, 8) << " (History)\n";
    diffEngine.showPatch(patch);
}

void Repository::checkout(const string &target)
{
    // Check if target is a branch name
    auto allBranches = branchManager.listBranches();
    bool isBranch = false;
    for (auto &b : allBranches)
        if (b == target) { isBranch = true; break; }

    if (isBranch)
    {
        branchManager.switchBranch(target);
        string headCommit = branchManager.getHeadCommit();
        if (!headCommit.empty())
        {
            cout << "Restoring files from commit "
                      << headCommit.substr(0,8) << "...\n";
            restoreCommit(headCommit);
        }
    }
    else
    {
        // Treat target as a commit ID (detached HEAD style)
        cout << "Checking out commit " << target.substr(0,8) << "...\n";
        restoreCommit(target);
    }
}

void Repository::branch(const string &name, const string &commitID)
{
    string target = commitID.empty() ? branchManager.getHeadCommit() : commitID;
    branchManager.createBranch(name, target);
}

void Repository::branches()
{
    cout << "Branches:\n";
    for (auto &b : branchManager.listBranches())
    {
        string marker = (b == branchManager.getCurrentBranch()) ? "* " : "  ";
        cout << marker << b << "\n";
    }
}

void Repository::search(const string &keyword)
{
    searchIndex.printResults(keyword);
}

void Repository::stats(const string &file1, const string &file2)
{
    if (!fs::exists(file1) || !fs::exists(file2))
    {
        cout << "File not found\n";
        return;
    }

    string c1 = fileManager.readFile(file1);
    string c2 = fileManager.readFile(file2);

    auto A     = diffEngine.splitLines(c1);
    auto B     = diffEngine.splitLines(c2);
    auto patch = diffEngine.generatePatch(A, B);

    statistics.showPatchStats(patch);
}

void Repository::gc()
{
    // Collect all branch head commit IDs using the branchManager
    vector<string> heads = branchManager.getAllBranchHeads();

    auto parentMap = commitGraph.getParentMap();
    garbageCollector.collect(heads, parentMap);
}

void Repository::graph()
{
    commitGraph.printHistory(branchManager.getHeadCommit());
}

void Repository::catFile(const string &commitID, const string &filename)
{
    if (!objectStore.commitExists(commitID)) return;
    Commit c = objectStore.loadCommit(commitID);
    auto it = c.fileTree.find(filename);
    if (it == c.fileTree.end()) return;
    string hash = it->second;
    string content = objectStore.loadObject(hash);
    cout << content;
}