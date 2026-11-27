using UnityEngine;
using System.Collections.Generic;

[RequireComponent(typeof(MeshRenderer),typeof(MeshFilter))]
public sealed partial class StreetCrowd : MonoBehaviour
{
    [Min(.1f)] public float spacing=.28f, rowSpacing=.25f;
    public int displayed { get; private set; }
    readonly List<Vector3> vertices=new List<Vector3>();
    readonly List<Vector2> uv=new List<Vector2>();
    readonly List<int> triangles=new List<int>();
    Mesh mesh;
    int previousFront=-1, previousBack=-1;
    float lastRadius;
    void EnsureMesh(){
        if(mesh)return;
        mesh=new Mesh {name="Rangées de passants"};
        mesh.MarkDynamic(); GetComponent<MeshFilter>().sharedMesh=mesh;
    }
    public void SetCount(int front,int back,float radius){
        EnsureMesh();
        if(front==previousFront && back==previousBack && Mathf.Approximately(radius,lastRadius))return;
        previousFront=front;previousBack=back;lastRadius=radius;displayed=front+back;
        vertices.Clear();uv.Clear();triangles.Clear();
        AddRows(front,-1,radius);AddRows(back,1,radius);
        mesh.Clear();mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);
    }
    void AddRows(int count,int side,float radius){
        for(int row=0;count>0;row++){
            int fullRow=8+row*2;
            int seats=Mathf.Min(count,fullRow);
            float depth=rowSpacing*row;
            float z=side*(radius+.66f+depth);
            float bend=side*Mathf.Sin(depth*.46f)*Mathf.Min(depth*.48f,1.45f);
            float stagger=(row%2)*spacing*.53f;
            float left=bend+stagger-fullRow*spacing*.5f;
            float right=left+seats*spacing;
            int n=vertices.Count;
            vertices.Add(new Vector3(left,0,z));vertices.Add(new Vector3(right,0,z));
            vertices.Add(new Vector3(right,.70f,z));vertices.Add(new Vector3(left,.70f,z));
            float y=(row%8)*2,x=(row%7)*.14f;
            uv.Add(new Vector2(x,y));uv.Add(new Vector2(x+seats/16f,y));
            uv.Add(new Vector2(x+seats/16f,y+.999f));uv.Add(new Vector2(x,y+.999f));
            triangles.Add(n);triangles.Add(n+2);triangles.Add(n+1);
            triangles.Add(n);triangles.Add(n+3);triangles.Add(n+2);
            count-=seats;
        }
    }
    void OnDestroy(){if(mesh)Destroy(mesh);if(pocketMesh)Destroy(pocketMesh);}
}
