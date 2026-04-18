// SHA1 -> secure hash algorithm 1 ( converts any input to 40 hex character )
#include "SHA1.h"
#include<sstream>
#include<iomanip>
#include<vector>
#include<cstdint>
#include<iostream>
#include<bits/stdc++.h>
using namespace std;
static uint32_t leftrotate(uint32_t value, int bits)
{
    return (value<<bits) | (value>>(32-bits));
}

string SHA1::hash(const string &input)
{
    vector<uint8_t> data(input.begin(), input.end());

    uint64_t original_bit_len = data.size() * 8;

    data.push_back(0x80);
    while ((data.size() * 8) % 512 != 448)
        data.push_back(0);

    for (int i = 7; i >= 0; i--)
        data.push_back((original_bit_len >> (i * 8)) & 0xFF);

    uint32_t h0 = 0x67452301;
    uint32_t h1 = 0xEFCDAB89;
    uint32_t h2 = 0x98BADCFE;
    uint32_t h3 = 0x10325476;
    uint32_t h4 = 0xC3D2E1F0;

    for (size_t chunk = 0; chunk < data.size(); chunk += 64)
    {
        uint32_t w[80];

        for (int i = 0; i < 16; i++)
        {
            w[i] = (data[chunk + i*4 + 0] << 24) |
                   (data[chunk + i*4 + 1] << 16) |
                   (data[chunk + i*4 + 2] << 8)  |
                   (data[chunk + i*4 + 3]);
        }

        for (int i = 16; i < 80; i++)
            w[i] = leftrotate(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1);

        uint32_t a = h0, b = h1, c = h2, d = h3, e = h4;

        for (int i = 0; i < 80; i++)
        {
            uint32_t f, k;

            if (i < 20)
            {
                f = (b & c) | ((~b) & d);  
                k = 0x5A827999;
            }
            else if (i < 40)
            {
                f = b ^ c ^ d;              
                k = 0x6ED9EBA1;
            }
            else if (i < 60)
            {
                f = (b & c) | (b & d) | (c & d); 
                k = 0x8F1BBCDC;
            }
            else
            {
                f = b ^ c ^ d;               
                k = 0xCA62C1D6;
            }

            uint32_t temp = leftrotate(a, 5) + f + e + k + w[i];
            e = d;
            d = c;
            c = leftrotate(b, 30);
            b = a;
            a = temp;
        }

        h0 += a; h1 += b; h2 += c; h3 += d; h4 += e;
    }

    std::stringstream ss;
    ss << std::hex << std::setfill('0')
       << std::setw(8) << h0
       << std::setw(8) << h1
       << std::setw(8) << h2
       << std::setw(8) << h3
       << std::setw(8) << h4;

    return ss.str();
}
