Shader "RoundAndRound/Encre sur porcelaine"
{
    Properties
    {
        _Color ("Teinte", Color) = (1,1,1,1)
        _Shade ("Clarté des faces à l’ombre", Range(0,1)) = 0.61
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            Tags { "LightMode"="ForwardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fwdbase
            #include "UnityCG.cginc"
            #include "AutoLight.cginc"

            fixed4 _Color;
            half _Shade;
            struct Pixel
            {
                float4 pos : SV_POSITION;
                half3 normal : TEXCOORD0;
                SHADOW_COORDS(1)
            };
            Pixel vert(appdata_base v)
            {
                Pixel o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.normal = UnityObjectToWorldNormal(v.normal);
                TRANSFER_SHADOW(o);
                return o;
            }
            fixed4 frag(Pixel p) : SV_Target
            {
                half facing = saturate((dot(normalize(p.normal), normalize(_WorldSpaceLightPos0.xyz)) + .35h) / 1.15h);
                half light = lerp(_Shade, 1, facing) * lerp(.84h, 1, SHADOW_ATTENUATION(p));
                return fixed4(_Color.rgb * light, 1);
            }
            ENDCG
        }
        UsePass "Legacy Shaders/VertexLit/SHADOWCASTER"
    }
    Fallback "Diffuse"
}
