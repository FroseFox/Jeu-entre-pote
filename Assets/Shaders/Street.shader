Shader "RoundAndRound/Foule" {
 Properties { _MainTex("Marche",2D)="white"{} }
 SubShader {
 Tags { "Queue"="AlphaTest" "RenderType"="TransparentCutout" }
 Pass {
 Cull Off
 CGPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "UnityCG.cginc"
 sampler2D _MainTex;
 struct Vertex {float4 vertex:POSITION;float2 uv:TEXCOORD0;};
 struct Pixel {float4 pos:SV_POSITION;float2 uv:TEXCOORD0;};
 Pixel vert(Vertex v){Pixel p;p.pos=UnityObjectToClipPos(v.vertex);p.uv=v.uv;return p;}
 fixed4 frag(Pixel p):SV_Target{
 float phase=fmod(floor(_Time.y*8)+floor(p.uv.y/2),8);
 float2 uv=float2(p.uv.x,(phase+saturate(fmod(p.uv.y,2)))/8);
 fixed4 c=tex2D(_MainTex,uv);clip(c.a-.28);return fixed4(c.rgb,1);
 }
 ENDCG
 }
 }
}
