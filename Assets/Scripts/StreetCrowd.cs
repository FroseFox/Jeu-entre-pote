using UnityEngine;
using System.Collections.Generic;

[RequireComponent(typeof(MeshRenderer),typeof(MeshFilter))]
public sealed class StreetCrowd : MonoBehaviour
{
    [Min(.1f)] public float spacing=.28f, rowSpacing=.25f;
    public int displayed { get; private set; }
    readonly List<Vector3> vertices=new List<Vector3>();
    readonly List<Vector2> uv=new List<Vector2>();
    readonly List<int> triangles=new List<int>();
    Mesh mesh;
    int previous=-1;
    float lastRadius;
    void Awake(){
        mesh=new Mesh {name="Rangées de passants"};
        mesh.MarkDynamic(); GetComponent<MeshFilter>().sharedMesh=mesh;
    }
    public void SetCount(int count,float radius){
        if(count==previous && Mathf.Approximately(radius,lastRadius))return;
        previous=count;lastRadius=radius;displayed=count;
        vertices.Clear();uv.Clear();triangles.Clear();
        int front=(int)(count*.68);
        AddRows(front,-1,radius);AddRows(count-front,1,radius);
        mesh.Clear();mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);
    }
    void AddRows(int count,int side,float radius){
        for(int row=0;count>0;row++){
            int seats=Mathf.Min(count,8+row*2);
            float half=seats*spacing*.5f,z=side*(radius+2.1f+rowSpacing*row);
            float center=Mathf.Sin(row*.034f)*Mathf.Min(row*.015f,5);
            int n=vertices.Count;
            vertices.Add(new Vector3(center-half,0,z));vertices.Add(new Vector3(center+half,0,z));
            vertices.Add(new Vector3(center+half,.95f,z));vertices.Add(new Vector3(center-half,.95f,z));
            float y=(row%8)*2,x=(row%7)*.14f;
            uv.Add(new Vector2(x,y));uv.Add(new Vector2(x+seats/16f,y));
            uv.Add(new Vector2(x+seats/16f,y+.999f));uv.Add(new Vector2(x,y+.999f));
            triangles.Add(n);triangles.Add(n+2);triangles.Add(n+1);
            triangles.Add(n);triangles.Add(n+3);triangles.Add(n+2);
            count-=seats;
        }
    }
    void OnDestroy(){if(mesh)Destroy(mesh);}
}
