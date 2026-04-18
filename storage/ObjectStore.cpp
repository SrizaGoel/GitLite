#include<iostream>
#include<bits/stdc++.h>
using namespace std;

#include "ObjectStore.h"
#include "../algorithms/SHA1.h"
#include "../algorithms/LineDiff.h"
#include "FileManager.h"

namespace fs=filesystem;

string ObjectStore::loosePath(const string &hash, const string &type)
{
    string base = ".gitlite/" + type + "/";
    if (hash.size() < 2) return base + hash;
    
    string dir = base + hash.substr(0, 2);
    // Ensure parent directory exists
    if (!fs::exists(dir))
        fs::create_directories(dir);
        
    return dir + "/" + hash.substr(2);
}
bool ObjectStore::existsInLoose(const string &hash)
{
    return fs::exists(loosePath(hash));
}

bool ObjectStore::existsInPack(const string &hash)
{
    return packIndex.count(hash) > 0;
}

ObjectStore::ObjectStore()
{
    loadPackIndexes();
}

void ObjectStore::loadPackIndexes()
{
    string packDir=".gitlite/objects/pack";
    if(!fs::exists(packDir))
        return;
    for (const auto &entry:fs::directory_iterator(packDir))     // why not recursive check here ?
    {
        if (entry.path().extension() != ".idx") continue;
        ifstream idx(entry.path());
        string line;
        while (getline(idx, line))
        {
            stringstream ss(line);
            string hash, packFile;
            long long offset;
            ss >> hash >> packFile >> offset;
            if (!hash.empty())
                // Store as "packfile:offset" so we can find it later
                packIndex[hash] = packFile + ":" + std::to_string(offset);
        }
    }
}

bool ObjectStore::objectExists(const string &hash)
{
    return existsInLoose(hash) || existsInPack(hash);
}

void ObjectStore::storeObject(const string &hash,const string &content, const string &prevHash)
{
    // Deduplication : if this exact content is already stored, skip
    if (objectExists(hash))
        return;

    string path = loosePath(hash);

    // Decide: store as FULL or DELTA?
    bool storeDelta = false;
    vector<string> patch;

    if (!prevHash.empty() && objectExists(prevHash))
    {
        // We have a previous version — compute delta
        string prevContent=loadObject(prevHash);

        LineDiff differ;
        auto A=differ.splitLines(prevContent);
        auto B=differ.splitLines(content);
        patch=differ.generatePatch(A, B);

        size_t patchSize = 0;
        for (auto &line : patch) patchSize += line.size() + 1;

        if (patchSize < content.size() * 0.6)
        {
            storeDelta = true;
        }
    }

    ofstream out(path);

    if (storeDelta)
    {
        cout << "type DELTA base=" << prevHash <<endl;
        for (auto &line : patch)
            out<<line<<endl;

        cout << "[store] DELTA object " << hash.substr(0,8)<< "... (base=" << prevHash.substr(0,8) << "...)"<<endl;
    }
    else
    {
        out << "type FULL\n";
        out << content;

        std::cout << "[store] FULL object " << hash.substr(0,8) << "...\n";
    }

    out.close();

    maybeRepack();
}

string ObjectStore::loadLooseRaw(const string &hash)
{
    ifstream in(loosePath(hash));
    if (!in.is_open()) return "";
    stringstream buf;
    buf << in.rdbuf();
    return buf.str();
}

string ObjectStore::resolveDelta(const string &hash, int depth)
{
    if (depth > MAX_DELTA_DEPTH)
    {
        cout<<"[warn] Delta chain too deep at "<<hash.substr(0,8)<<endl;
        return "";
    }

    string raw;

    if(existsInLoose(hash))
    {
        raw=loadLooseRaw(hash);
    }
    else if(existsInPack(hash))
    {
        PackEntry entry=loadFromPack(hash);
        if(entry.type=="FULL")  
            return entry.data;
        if(entry.type=="DELTA")
        {
            string baseContent = resolveDelta(entry.baseHash, depth + 1);
            LineDiff differ;
            vector<string> patchLines = differ.splitLines(entry.data);
            return differ.applyPatch(baseContent, patchLines);
        }
        return entry.data;
    }
    else
    {
        cout << "[error] Object not found: " << hash << "\n";
        return "";
    }

    stringstream ss(raw);
    string header;
    getline(ss, header);  
    if (header.find("FULL") != string::npos)
    {
        string content;
        char ch;
        while (ss.get(ch))
        {
            content += ch;
        }
        return content;
    }
    else if (header.find("DELTA") != string::npos)
    {
        size_t eq = header.find('=');
        string baseHash = header.substr(eq + 1);

        vector<string> patchLines;
        string line;
        while (std::getline(ss, line))
            patchLines.push_back(line);

        string baseContent = resolveDelta(baseHash, depth + 1);

        LineDiff differ;
        return differ.applyPatch(baseContent, patchLines);
    }

    return "";
}

string ObjectStore::loadObject(const string &hash)
{
    return resolveDelta(hash, 0);
}

void ObjectStore::storeCommit(const Commit &commit)
{
    string path = loosePath(commit.id, "commits");
    FileManager fm;
    fm.writeFile(path, commit.serialize());
}

Commit ObjectStore::loadCommit(const string &commitID)
{
    string fullID = resolveID(commitID);
    if (fullID == "")
    {
        // For now, let's return an empty commit or throw. 
        // Based on existing code, we'll assume it's checked by commitExists first.
        // But let's be safe.
        throw runtime_error("Commit not found: " + commitID);
    }
    string path = loosePath(fullID, "commits");
    FileManager fm;
    string data = fm.readFile(path);
    return Commit::deserialize(data);
}

bool ObjectStore::commitExists(const string &commitID)
{
    string fullID = resolveID(commitID);
    if (fullID == "") return false;
    string path = loosePath(fullID, "commits");
    return fs::exists(path);
}

string ObjectStore::resolveID(const string &prefix)
{
    if (prefix.length() == 40) return prefix;
    if (prefix.length() < 4) return ""; // Minimum 4 chars for safety

    string ab = prefix.substr(0, 2);
    string rest = prefix.substr(2);
    string dir = ".gitlite/commits/" + ab;

    if (!fs::exists(dir)) return "";

    vector<string> matches;
    for (const auto &entry : fs::directory_iterator(dir))
    {
        string name = entry.path().filename().string();
        if (name.compare(0, rest.length(), rest) == 0)
        {
            matches.push_back(ab + name);
        }
    }

    if (matches.size() == 1) return matches[0];
    return ""; // Ambiguous or not found
}

vector<string> ObjectStore::getAllCommitIDs()
{
    vector<string>result;
    string dir = ".gitlite/commits";
    if (!fs::exists(dir)) return result;
    
    for (const auto &subdir : fs::directory_iterator(dir))
    {
        if (!fs::is_directory(subdir)) continue;
        string prefix = subdir.path().filename().string();

        for (const auto &file : fs::directory_iterator(subdir.path()))
        {
            if (fs::is_regular_file(file.path()))
                result.push_back(prefix + file.path().filename().string());
        }
    }
    return result;
}

vector<string> ObjectStore::getAllLooseHashes()
{
    vector<string> result;
    string looseDir = ".gitlite/objects";
    if (!fs::exists(looseDir)) return result;

    // Iterate two levels: looseDir/ab/cdef...
    for (const auto &subdir : fs::directory_iterator(looseDir))
    {
        string prefix = subdir.path().filename().string();
        if (prefix == "pack") continue;

        for (const auto &file : fs::directory_iterator(subdir.path()))
        {
            if (fs::is_regular_file(file.path()))
                result.push_back(prefix + file.path().filename().string());
        }
    }

    return result;
}

int ObjectStore::countLooseObjects()
{
    return (int)getAllLooseHashes().size();
}

void ObjectStore::maybeRepack()
{
    if (countLooseObjects() >= PACK_THRESHOLD)
    {
        std::cout << "[gc] Loose object threshold reached. Auto-packing...\n";
        repack();
    }
}

void ObjectStore::repack()
{
    auto hashes = getAllLooseHashes();
    if (hashes.empty())
    {
        std::cout << "[pack] Nothing to pack\n";
        return;
    }
    auto now = std::time(nullptr);
    string packName = "pack-" + to_string(now) + "-" + to_string(hashes.size());
    string packPath = ".gitlite/objects/pack/" + packName + ".pack";
    string idxPath  = ".gitlite/objects/pack/" + packName + ".idx";

    fs::create_directories(".gitlite/objects/pack");

    std::ofstream packFile(packPath);
    std::ofstream idxFile(idxPath);
    packFile << "GLPACK 1 " << hashes.size() << "\n";

    for (const auto &hash : hashes)
    {
        long long offset = packFile.tellp();

        string raw = loadLooseRaw(hash);
        stringstream ss(raw);
        string header;
        getline(ss, header);

        string type     = "FULL";
        string baseHash = "NONE";

        if (header.find("DELTA") != string::npos)
        {
            type = "DELTA";
            size_t eq = header.find('=');
            if (eq != string::npos)
                baseHash = header.substr(eq + 1);
        }

        // Read remaining content
        string content{ istreambuf_iterator<char>(ss), istreambuf_iterator<char>() };

        // Write to pack file
        packFile << "ENTRY " << hash << " " << type << " " << baseHash << "\n";
        packFile << "DATA_BEGIN\n";
        packFile << content;
        packFile << "\nDATA_END\n";

        idxFile << hash << " " << packName << ".pack " << offset << "\n";

        packIndex[hash] = packName + ".pack:" + to_string(offset);
    }

    packFile.close();
    idxFile.close();

    for (const auto &hash : hashes)
    {
        std::string path = loosePath(hash);
        if (fs::exists(path))
        {
            fs::remove(path);
            fs::path parent = fs::path(path).parent_path();
            if (fs::is_empty(parent))
                fs::remove(parent);
        }
    }

    std::cout << "[pack] Packed " << hashes.size() << " objects into " << packName << ".pack\n";
}

PackEntry ObjectStore::loadFromPack(const string &hash)
{
    PackEntry entry;
    entry.hash = hash;

    if (!packIndex.count(hash)) return entry;

    string location = packIndex[hash];
    size_t colon = location.find(':');
    string packName = location.substr(0, colon);
    long long offset = stoll(location.substr(colon + 1));

    string packPath = ".gitlite/objects/pack/" + packName;
    ifstream packFile(packPath);
    if (!packFile.is_open()) return entry;
    packFile.seekg(offset);

    string entryHeader;
    getline(packFile, entryHeader);

    stringstream hss(entryHeader);
    string keyword;
    hss >> keyword >> entry.hash >> entry.type >> entry.baseHash;

    if (entry.baseHash == "NONE") entry.baseHash = "";

    string marker;
    getline(packFile, marker); 

    string line;
    string data;
    while (std::getline(packFile, line))
    {
        if (line == "DATA_END") break;
        data += line + "\n";
    }
    if (!data.empty() && data.back() == '\n') data.pop_back();
    entry.data = data;

    return entry;
}

string ObjectStore::storePatch(const vector<string> &patch)
{
    stringstream combined;
    for(auto &line:patch)
    {
        combined<<line<<endl;
    }

    string hash=SHA1::hash(combined.str());
    string path=".gitlite/patches/"+hash;

    if(!fs::exists(".gitlite/patches"))
        fs::create_directories(".gitlite/patches");

    if(!fs::exists(path))
    {
        FileManager fm;
        fm.writeFile(path,combined.str());
    }

    return hash;
}

std::vector<std::string> ObjectStore::loadPatch(const string &patchID)
{
    vector<string> patch;
    FileManager fm;
    string content=fm.readFile(".gitlite/patches/"+patchID);
    stringstream ss(content);
    string line;
    while(getline(ss,line))
    {
        patch.push_back(line);
    }
    return patch;
}

string ObjectStore::reconstructFile(const string &baseObject,const vector<string> &patch)
{
    LineDiff diff;
    FileManager fm;
    string baseContent=fm.readFile(".gitlite/objects/"+baseObject);
    string result=diff.applyPatch(baseContent,patch);
    return result;
}