using UnityEngine;

public sealed class ArrivalVehicle : MonoBehaviour
{
    public Transform carriage, wing;
    int destination; float elapsed;
    public void Dispatch(int route){destination=route;elapsed=0;gameObject.SetActive(true);carriage.gameObject.SetActive(route==1);wing.gameObject.SetActive(route==2);Position();}
    void Position(){
        float t=elapsed<2?Mathf.SmoothStep(-11,-3.8f,elapsed/2):Mathf.SmoothStep(-3.8f,12,(elapsed-3)/2.7f);
        transform.localPosition=new Vector3(t,.06f+(destination==2?Mathf.Max(0,Mathf.Abs(t)-4)*.2f:0),-5.5f);
    }
    public void Step(float dt){if(!gameObject.activeSelf)return;elapsed+=dt;Position();if(elapsed>=5.7f)gameObject.SetActive(false);}
}
