using UnityEngine;

public sealed class BladeProfile : MonoBehaviour
{
    public Transform[] sections;
    public float innerRadius=.17f, outerRadius=2.26f;
    public void Shape(int level){
        float bend=level==0?0:level==1?.83f:level==2?1.18f:level==3?1.75f:1.38f;
        float power=level==1?3:level==2?1.5f:level==4?.72f:1;
        for(int i=0;i<sections.Length;i++){
            Vector3 a=Point((float)i/sections.Length,bend,power),b=Point((float)(i+1)/sections.Length,bend,power);
            sections[i].localPosition=(a+b)*.5f;
            sections[i].localRotation=Quaternion.FromToRotation(Vector3.right,(b-a).normalized);
            sections[i].localScale=new Vector3((b-a).magnitude+.013f,1,1);
        }
    }
    Vector3 Point(float t,float bend,float power){
        float radius=Mathf.Lerp(innerRadius,outerRadius,t),angle=bend*Mathf.Pow(t,power);
        return new Vector3(radius*Mathf.Cos(angle),0,radius*Mathf.Sin(angle));
    }
}
