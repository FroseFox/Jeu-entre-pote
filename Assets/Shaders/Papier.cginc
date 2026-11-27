#ifndef ROUND_AND_ROUND_PAPER_INCLUDED
#define ROUND_AND_ROUND_PAPER_INCLUDED
float _RRDark, _RRPaperDim;
inline half3 PaperColor(half3 rgb)
{
    #ifndef UNITY_COLORSPACE_GAMMA
        rgb = LinearToGammaSpace(rgb);
    #endif
    rgb = lerp(rgb, 1 - saturate(rgb), _RRDark) * (1 - _RRPaperDim);
    #ifndef UNITY_COLORSPACE_GAMMA
        rgb = GammaToLinearSpace(rgb);
    #endif
    return rgb;
}
#endif
