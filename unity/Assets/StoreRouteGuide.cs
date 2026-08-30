using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.InputSystem;

/// <summary>
/// 店舗入口から目的地の棚までのNavMesh経路を計算し、
/// 床上に連続した青い線と進行方向を示す矢印オブジェクトを表示するスクリプト
/// </summary>
public class StoreRouteGuide : MonoBehaviour
{
    [Header("経路の始点と終点")]
    [Tooltip("店舗入口の PlayerStart を指定してください")]
    [SerializeField] private Transform startPoint;

    [Tooltip("目的地の DestinationPoint_Shelf_08 を指定してください")]
    [SerializeField] private Transform destinationPoint;

    [Header("矢印ガイド設定")]
    [Tooltip("進行方向を示す矢印のPrefabをアサインしてください")]
    [SerializeField] private GameObject arrowPrefab;

    [Tooltip("矢印を配置する間隔（メートル）")]
    [SerializeField] private float arrowInterval = 1.2f;

    [Tooltip("矢印を表示する床からの高さ（メートル）")]
    [SerializeField] private float arrowHeight = 0.18f;

    [Header("ルート線の描画設定")]
    [Tooltip("ルート線の床からの高さ（メートル）")]
    [SerializeField] private float lineFixedYPosition = 0.15f;

    [Tooltip("線の太さ（メートル）")]
    [SerializeField] private float lineWidth = 0.25f;

    [Tooltip("線の表示色")]
    [SerializeField] private Color routeColor = new Color(0.145f, 0.388f, 0.922f, 1f); // 濃い青色 #2563EB

    private LineRenderer lineRenderer;
    private Material routeMaterial;
    private readonly List<GameObject> spawnedArrows = new List<GameObject>();

    private void Awake()
    {
        SetupLineRenderer();
    }

    private void Update()
    {
        // 新しい Input System による R キーの押し下げ判定
        if (Keyboard.current != null && Keyboard.current.rKey.wasPressedThisFrame)
        {
            ShowRoute();
        }
    }

    /// <summary>
    /// LineRenderer と URP用マテリアルの動的初期設定
    /// </summary>
    private void SetupLineRenderer()
    {
        lineRenderer = GetComponent<LineRenderer>();
        if (lineRenderer == null)
        {
            lineRenderer = gameObject.AddComponent<LineRenderer>();
        }

        lineRenderer.useWorldSpace = true;
        lineRenderer.startWidth = lineWidth;
        lineRenderer.endWidth = lineWidth;
        lineRenderer.numCornerVertices = 8;
        lineRenderer.numCapVertices = 8;

        // URP対応シェーダーマテリアルの自動作成
        // 注意: "Universal Render Pipeline/Lit" を最優先で使用する。
        // このシェーダーは棚・床・矢印など既存マテリアルで実際に参照されているため、
        // WebGLビルドでシェーダーストリッピングの対象にならず確実に含まれる。
        // Unlit系シェーダーはプロジェクト内のどのマテリアルからも参照されていないため、
        // WebGLビルドで除去され、ルート線がマゼンタ（シェーダー欠落色）で表示される原因になっていた。
        Shader routeShader = Shader.Find("Universal Render Pipeline/Lit");
        if (routeShader == null)
        {
            routeShader = Shader.Find("Universal Render Pipeline/Unlit");
        }
        if (routeShader == null)
        {
            routeShader = Shader.Find("Unlit/Color");
        }

        routeMaterial = new Material(routeShader);
        routeMaterial.name = "Mat_GeneratedRouteGuide";

        if (routeMaterial.HasProperty("_BaseColor"))
        {
            routeMaterial.SetColor("_BaseColor", routeColor);
        }
        else
        {
            routeMaterial.color = routeColor;
        }

        // Litシェーダーを使う場合でも光源の影響で色味が揺れないよう、
        // 弱めのEmissionを併用して見た目の色を安定させる（白飛びしない程度に抑える）
        if (routeMaterial.HasProperty("_EmissionColor"))
        {
            routeMaterial.EnableKeyword("_EMISSION");
            routeMaterial.SetColor("_EmissionColor", routeColor * 0.5f);
        }

        lineRenderer.material = routeMaterial;
        lineRenderer.enabled = false;
    }

    /// <summary>
    /// ルート線と進行方向矢印を表示します
    /// </summary>
    public void ShowRoute()
    {
        // 既存の表示物・矢印を一旦全削除
        ClearArrows();

        if (startPoint == null || destinationPoint == null)
        {
            Debug.LogError("[StoreRouteGuide] エラー: startPoint または destinationPoint が Inspector で設定されていません。");
            return;
        }

        // 1. NavMesh.SamplePosition によるスタート/ゴール位置補正
        Vector3 startPos = startPoint.position;
        Vector3 destPos = destinationPoint.position;

        if (NavMesh.SamplePosition(startPos, out NavMeshHit startHit, 2.0f, NavMesh.AllAreas))
        {
            startPos = startHit.position;
        }
        if (NavMesh.SamplePosition(destPos, out NavMeshHit destHit, 2.0f, NavMesh.AllAreas))
        {
            destPos = destHit.position;
        }

        // 2. 経路計算
        NavMeshPath path = new NavMeshPath();
        bool calculateSuccess = NavMesh.CalculatePath(startPos, destPos, NavMesh.AllAreas, path);

        if (!calculateSuccess || path.status == NavMeshPathStatus.PathInvalid)
        {
            Debug.LogError($"[StoreRouteGuide] 経路計算失敗: ルートを生成できませんでした (PathInvalid)。\n" +
                           $"【原因】スタートまたはゴールがNavMesh範囲外か、障害物で途切れています。");
            HideRoute();
            return;
        }

        if (path.status == NavMeshPathStatus.PathPartial)
        {
            Debug.LogWarning("[StoreRouteGuide] 警告: 目的地までの途中で遮断された不完全なルートです。");
        }

        if (path.corners == null || path.corners.Length < 2)
        {
            Debug.LogError("[StoreRouteGuide] エラー: 経由ポイント数が不足しています。");
            HideRoute();
            return;
        }

        // 3. LineRenderer へ座標を設定 (高さ 0.15m)
        Vector3[] routePositions = new Vector3[path.corners.Length];
        for (int i = 0; i < path.corners.Length; i++)
        {
            Vector3 point = path.corners[i];
            point.y = lineFixedYPosition;
            routePositions[i] = point;
        }

        lineRenderer.positionCount = routePositions.Length;
        lineRenderer.SetPositions(routePositions);
        lineRenderer.enabled = true;

        // 4. ルート上に 1.2m 間隔で矢印を生成・配置
        GenerateRouteArrows(path.corners);

        Debug.Log($"[StoreRouteGuide] ルートを表示しました。（矢印数: {spawnedArrows.Count} 個）");
    }

    /// <summary>
    /// 外部（Web連携等）から目的地を安全に変更します。ShowRouteは自動実行しません。
    /// </summary>
    /// <param name="newDestination">新しい目的地のTransform</param>
    public void SetDestination(Transform newDestination)
    {
        if (newDestination == null)
        {
            Debug.LogWarning("[StoreRouteGuide] SetDestination: newDestination が null のため目的地を変更しませんでした。");
            return;
        }

        destinationPoint = newDestination;
    }

    /// <summary>
    /// ルートのコーナー座標に沿って 1.2m 間隔で矢印を生成します
    /// </summary>
    private void GenerateRouteArrows(Vector3[] corners)
    {
        if (arrowPrefab == null)
        {
            Debug.LogWarning("[StoreRouteGuide] arrowPrefab が設定されていないため、矢印の生成をスキップします。");
            return;
        }

        float distanceCovered = 0f;
        float nextSpawnDistance = arrowInterval; // 始点から 1.2m 地点に最初の矢印を配置

        for (int i = 0; i < corners.Length - 1; i++)
        {
            Vector3 start = corners[i];
            Vector3 end = corners[i + 1];

            // 水平方向の距離と向きを計算
            Vector3 dir = end - start;
            Vector3 flatDir = new Vector3(dir.x, 0f, dir.z);
            float segmentLength = flatDir.magnitude;

            if (segmentLength <= 0.001f) continue;

            Vector3 forwardDirection = flatDir.normalized;

            // セグメント内で 1.2m 間隔ごとに矢印を配置
            while (distanceCovered + segmentLength >= nextSpawnDistance)
            {
                float distOnSegment = nextSpawnDistance - distanceCovered;
                Vector3 spawnPos = start + (end - start).normalized * distOnSegment;

                // NavMesh に再フィッティングして高さや位置を補正
                if (NavMesh.SamplePosition(spawnPos, out NavMeshHit hit, 1.0f, NavMesh.AllAreas))
                {
                    spawnPos = hit.position;
                }

                // 高さ（Y座標）を 0.18m 上に設定
                spawnPos.y = arrowHeight;

                // 進行方向を向かせる回転を計算
                Quaternion rotation = Quaternion.LookRotation(forwardDirection, Vector3.up);

                // 矢印オブジェクトを生成
                GameObject arrowObj = Instantiate(arrowPrefab, spawnPos, rotation, transform);
                spawnedArrows.Add(arrowObj);

                nextSpawnDistance += arrowInterval;
            }

            distanceCovered += segmentLength;
        }
    }

    /// <summary>
    /// 表示中のルート線と矢印を非表示（削除）にします
    /// </summary>
    public void HideRoute()
    {
        if (lineRenderer != null)
        {
            lineRenderer.enabled = false;
        }

        ClearArrows();
    }

    /// <summary>
    /// 生成済みの矢印オブジェクトを削除します
    /// </summary>
    private void ClearArrows()
    {
        foreach (GameObject arrow in spawnedArrows)
        {
            if (arrow != null)
            {
                Destroy(arrow);
            }
        }
        spawnedArrows.Clear();
    }

    private void OnDestroy()
    {
        ClearArrows();

        if (routeMaterial != null)
        {
            Destroy(routeMaterial);
        }
    }
}