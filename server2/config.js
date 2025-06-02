module.exports = {
    zerodha: {
        apiKey: process.env.ZERODHA_API_KEY || '01j6gypn2epvqdw9',
        accessToken: process.env.ZERODHA_ACCESS_TOKEN || 'Fe5KCokOrq9n1m4N7cwhRldQfVlmTBAD',
        // Add other Zerodha-specific configurations here
    },
    sectorStocks: {
        "Banking & Financial Services": {
            "IDBI": 377857,
            "SOUTHBANK": 1522689,
            "IOB": 2393089,
            "PNB": 2730497,
            "CANBK": 2763265,
            "IDFCFIRSTB": 2863105,
            "UCOBANK": 2873089,
            "MAHABANK": 2912513,
            "YESBANK": 3050241,
            "CENTRALBK": 3812865,
            "PSB": 5376257
        },
        "Energy & Power": {
            "NLCINDIA": 2197761,
            "JPPOWER": 3011329,
            "SUZLON": 3076609,
            "RENUKA": 3078657,
            "RPOWER": 3906305,
            "NHPC": 4454401,
            "SJVN": 4834049
        },
        "Infrastructure & Engineering": {
            "NCC": 593665,
            "PNCINFRA": 2402561,
            "TARMAT": 3781377,
            "KNRCON": 3912449,
            "IRB": 3920129,
            "ASHOKA": 5166593,
            "SALASAR": 5468673,
            "NBCC": 8042241
        },
        "Chemicals & Specialty Materials": {
            "GHCL": 288513,
            "NOCIL": 625153,
            "PIDILITIND": 681985,
            "SRF": 837889,
            "IGL": 2883073,
            "KIRIINDUS": 4259585,
            "VIKASECO": 6593537
        },
        "Iron & Steel": {
            "HITECH": 734209,
            "SAIL": 758529,
            "TATASTEEL": 895745,
            "JINDALSTEL": 1723649,
            "RAMASTEEL": 2636801,
            "MUKANDLTD": 2899201,
            "JSWSTEEL": 3001089,
            "MSPL": 3051265
        },
        "FMCG & Consumer Goods": {
            "ADOR": 8705,
            "BCLIND": 643329,
            "HATSUN": 996353,
            "HERITGFOOD": 1177089,
            "VADILALIND": 6194177
        },
        "Textiles & Manufacturing": {
            "ARVIND": 49409,
            "RAYMOND": 731905,
            "SRF": 837889,
            "VARDMNPOLY": 933377,
            "TRIDENT": 2479361,
            "PAGEIND": 3689729,
            "KPRMILL": 3817473
        },
        "Logistics & Transport": {
            "MAHLOG": 98561,
            "BLUEDART": 126721,
            "CONCOR": 1215745,
            "VRLLOG": 2226177,
            "NAVKARCORP": 2702593,
            "TCI": 2708481,
            "ALLCARGO": 3456257
        },
        "Real Estate": {
            "MAHLIFE": 2060801,
            "SOBHA": 3539457,
            "PHOENIXLTD": 3725313,
            "DLF": 3771393,
            "BRIGADE": 3887105,
            "SUNTECK": 4516097,
            "GODREJPROP": 4576001,
            "OBEROIRLTY": 5181953,
            "PRESTIGE": 5197313
        }
    }
};