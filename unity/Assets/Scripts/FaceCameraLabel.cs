using UnityEngine;

/// <summary>
/// 新しく追加した案内テキスト（入口・レジ・現在地・目的地）専用の簡易Billboard。
/// Y軸周りの回転だけでMain Cameraの方を向き、文字が上下逆にならないようにする。
/// 既存の棚Signやカメラ側の処理には一切関与しない。
/// </summary>
public class FaceCameraLabel : MonoBehaviour
{
    private Transform cachedCameraTransform;

    private void Awake()
    {
        if (Camera.main != null)
        {
            cachedCameraTransform = Camera.main.transform;
        }
    }

    private void LateUpdate()
    {
        if (cachedCameraTransform == null)
        {
            return;
        }

        Vector3 toCamera = cachedCameraTransform.position - transform.position;
        toCamera.y = 0f;

        if (toCamera.sqrMagnitude < 0.0001f)
        {
            return;
        }

        // 文字の読める面（法線）がカメラを向くよう、その反対方向をforwardとして向かせる。
        // Y軸だけの回転にすることで、俯瞰角度が変わっても文字が上下逆にならない。
        Vector3 away = -toCamera.normalized;
        transform.rotation = Quaternion.LookRotation(away, Vector3.up);
    }
}
