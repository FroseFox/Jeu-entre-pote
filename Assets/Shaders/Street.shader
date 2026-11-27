Shader "RoundAndRound/Foule"
{
    Properties { _MainTex("Marche",2D)="white"{} }
    SubShader
    {
        Tags { "Queue"="AlphaTest" "RenderType"="TransparentCutout" }
        Pass
        {
            Cull Off
            CGPROGRAM
            #pragma target 3.0
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            #include "Papier.cginc"
            sampler2D _MainTex;
            float4 _RRPocketRotation;
            float _RRWalkPhase;
            struct Vertex {float4 vertex:POSITION;float2 uv:TEXCOORD0;float2 anchor:TEXCOORD1;};
            struct Pixel {float4 pos:SV_POSITION;float2 uv:TEXCOORD0;};
            Pixel vert(Vertex v)
            {
                float2 rotation=_RRPocketRotation.xy;
                v.vertex.xz+=float2(dot(v.anchor,rotation),dot(v.anchor,float2(-rotation.y,rotation.x)));
                Pixel p;p.pos=UnityObjectToClipPos(v.vertex);p.uv=v.uv;return p;
            }
            fixed4 frag(Pixel p):SV_Target
            {
                float row=floor(p.uv.y*.5);
                float frame=fmod(floor(_RRWalkPhase*8)+row,8);
                float2 uv=float2(p.uv.x,(frame+clamp(p.uv.y-row*2,.008,.992))/8);
                // Take derivatives before wrapping the frame to avoid seams at atlas edges.
                fixed4 c=tex2Dgrad(_MainTex,uv,ddx(p.uv)*float2(1,.125),ddy(p.uv)*float2(1,.125));
                clip(c.a-.27);
                half ink=dot(c.rgb,half3(.2126,.7152,.0722));
                return fixed4(PaperColor(ink.xxx),1);
            }
            ENDCG
        }
    }
}
