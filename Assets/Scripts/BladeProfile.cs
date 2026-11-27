using UnityEngine;

[RequireComponent(typeof(MeshFilter))]
public sealed class BladeProfile : MonoBehaviour
{
    [Tooltip("Profils de la pale, du premier niveau au dernier.")]
    public Mesh[] profiles;

    public void Shape(int level)
    {
        if (profiles == null || profiles.Length == 0) return;
        var profile = profiles[Mathf.Clamp(level, 0, profiles.Length - 1)];
        if (profile) GetComponent<MeshFilter>().sharedMesh = profile;
    }
}
